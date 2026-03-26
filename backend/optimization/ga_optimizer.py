import os
import pickle
import random
from multiprocessing import Pool
from typing import Any, Callable, Dict, Optional, Tuple

import numpy as np
from deap import base, creator, tools

_GA_EVAL_FN = None
_GA_PARAM_NAMES = None
_GA_PARAM_BOUNDS = None


def _init_worker(eval_fn, param_names, param_bounds):
    """
    Pool initializer: runs once in each worker process to set globals.
    Required on macOS/Windows where 'spawn' start method is used and
    globals from the parent process are NOT inherited by workers.
    """
    global _GA_EVAL_FN, _GA_PARAM_NAMES, _GA_PARAM_BOUNDS
    _GA_EVAL_FN = eval_fn
    _GA_PARAM_NAMES = param_names
    _GA_PARAM_BOUNDS = param_bounds


def _parallel_eval_wrapper(individual):
    """
    Wrapper used by multiprocessing workers.

    Converts a GA individual (list of parameters) into
    a parameter dictionary and calls the evaluation
    function.

    Returns DEAP fitness tuple: (cost,) — DEAP with weights=(-1.0,)
    will internally negate this to minimize cost correctly.
    """

    if _GA_EVAL_FN is None:
        # Return large penalty as positive cost (DEAP will minimize it)
        return (1e12,)

    try:
        params = {}
        for i, name in enumerate(_GA_PARAM_NAMES):
            low, high, dtype = _GA_PARAM_BOUNDS[name]
            val = individual[i]

            # ensure value respects bounds and datatype
            if dtype == "int":
                v = int(round(val))
                v = max(int(low), min(int(high), v))
            else:
                v = float(val)
                v = max(float(low), min(float(high), v))

            params[name] = v

        cost = float(_GA_EVAL_FN(params))

        if not np.isfinite(cost):
            cost = 1e12
    except Exception:
        cost = 1e12

    return (float(cost),)


class GAOptimizer:
    """
    Genetic Algorithm optimizer using DEAP.

    Goal:
    Minimize a cost metric (e.g., implementation shortfall)
    by evolving parameters such as slice frequency,
    participation cap, aggressiveness etc.

    Improvements implemented:

    • Elitism (HallOfFame) – best solution never lost
    • Adaptive mutation rate – exploration early, refinement later
    • Bounded mutation – parameters always remain valid
    • Diversity injection – prevents premature convergence
    • Early stopping – stop if no improvement
    • Checkpointing – resume long optimizations
    • Warm start – seed good parameters
    • Parallel evaluation – faster simulations
    """

    def __init__(
        self,
        evaluation_function: Callable[[Dict[str, Any]], float],
        param_bounds: Dict[str, Tuple[float, float, str]],
        population_size: int = 40,
        generations: int = 25,
        seed: int = 42,
        cxpb: float = 0.7,
        mutpb: float = 0.25,
        n_workers: int = 1,
        patience: int = 10,
    ):
        # random seeds for reproducibility
        random.seed(seed)
        np.random.seed(seed)

        self.evaluate_fn = evaluation_function
        self.param_bounds = param_bounds
        self.param_names = list(param_bounds.keys())

        self.population_size = population_size
        self.generations = generations

        # crossover probability
        self.cxpb = cxpb

        # mutation probability (adaptive during evolution)
        self.initial_mutpb = mutpb
        self.mutpb = mutpb

        self.seed = seed

        # multiprocessing workers
        self.n_workers = max(1, int(n_workers))

        # early stopping patience
        self.patience = patience

        self._setup_deap()

    def _setup_deap(self):
        # Avoid duplicate DEAP class creation errors
        if "FitnessMin" not in creator.__dict__:
            creator.create("FitnessMin", base.Fitness, weights=(-1.0,))

        if "Individual" not in creator.__dict__:
            creator.create("Individual", list, fitness=creator.FitnessMin)

        self.toolbox = base.Toolbox()

        attr_generators = []

        # Register attribute generators for each parameter
        for name, (low, high, dtype) in self.param_bounds.items():
            if dtype == "int":
                self.toolbox.register(f"attr_{name}", random.randint, int(low), int(high))
            else:
                self.toolbox.register(f"attr_{name}", random.uniform, float(low), float(high))

            attr_generators.append(getattr(self.toolbox, f"attr_{name}"))

        # Individual = list of parameter values
        self.toolbox.register(
            "individual",
            tools.initCycle,
            creator.Individual,
            attr_generators,
            n=1,
        )

        # Population = list of individuals
        self.toolbox.register("population", tools.initRepeat, list, self.toolbox.individual)

        # Crossover operator (blends parameter values)
        self.toolbox.register("mate", tools.cxBlend, alpha=0.5)

        # Mutation operator with bounds
        lows = [v[0] for v in self.param_bounds.values()]
        highs = [v[1] for v in self.param_bounds.values()]

        self.toolbox.register(
            "mutate",
            tools.mutPolynomialBounded,
            eta=10,
            low=lows,
            up=highs,
            indpb=0.2,
        )

        # Selection operator
        self.toolbox.register("select", tools.selTournament, tournsize=3)

        # Evaluation function
        self.toolbox.register("evaluate", self._evaluate)

    def _repair(self, individual):
        """
        Ensures parameter values stay inside bounds.
        Useful after crossover/mutation.
        """

        for i, name in enumerate(self.param_names):
            low, high, dtype = self.param_bounds[name]
            val = individual[i]

            if dtype == "int":
                val = int(round(val))
                val = max(int(low), min(int(high), val))
            else:
                val = float(val)
                val = max(float(low), min(float(high), val))

            individual[i] = val

        return individual

    def _evaluate(self, individual):
        """
        Converts individual -> parameter dictionary
        and calls user evaluation function.
        """

        self._repair(individual)

        params = {}
        for i, name in enumerate(self.param_names):
            _, _, dtype = self.param_bounds[name]
            params[name] = int(individual[i]) if dtype == "int" else float(individual[i])

        try:
            cost = float(self.evaluate_fn(params))
            if not np.isfinite(cost):
                cost = 1e12
        except Exception:
            cost = 1e12

        # weights=(-1.0,) in FitnessMin means DEAP already negates internally to minimize.
        # So we return (cost,) directly — NOT (-cost,).
        return (cost,)

    def optimize(self, verbose: bool = True, checkpoint_path: Optional[str] = None):
        """
        Runs the full genetic algorithm optimization.
        """

        if checkpoint_path and os.path.exists(checkpoint_path):
            with open(checkpoint_path, "rb") as file_obj:
                checkpoint = pickle.load(file_obj)

            pop = checkpoint["population"]
            start_gen = checkpoint["generation"]
            halloffame = checkpoint["halloffame"]

            random.setstate(checkpoint["rndstate"])
        else:
            pop = self.toolbox.population(n=self.population_size)
            start_gen = 0
            halloffame = tools.HallOfFame(1)

        if hasattr(self, "seed_individual"):
            pop[0] = creator.Individual(self.seed_individual)

        pool = None

        if self.n_workers > 1:
            global _GA_EVAL_FN, _GA_PARAM_NAMES, _GA_PARAM_BOUNDS

            _GA_EVAL_FN = self.evaluate_fn
            _GA_PARAM_NAMES = self.param_names
            _GA_PARAM_BOUNDS = self.param_bounds

            pool = Pool(
                self.n_workers,
                initializer=_init_worker,
                initargs=(self.evaluate_fn, self.param_names, self.param_bounds),
            )

            self.toolbox.register("evaluate", _parallel_eval_wrapper)
            self.toolbox.register("map", pool.map)
        else:
            self.toolbox.register("map", map)

        fitnesses = list(self.toolbox.map(self.toolbox.evaluate, pop))

        for ind, fit in zip(pop, fitnesses):
            ind.fitness.values = fit

        halloffame.update(pop)

        best_cost = float("inf")
        no_improve = 0

        for gen in range(start_gen, self.generations):
            # adaptive mutation rate
            self.mutpb = max(0.05, self.initial_mutpb * (1 - gen / self.generations))

            # selection
            offspring = self.toolbox.select(pop, len(pop))
            offspring = list(map(self.toolbox.clone, offspring))

            # crossover
            for c1, c2 in zip(offspring[::2], offspring[1::2]):
                if random.random() < self.cxpb:
                    self.toolbox.mate(c1, c2)
                    del c1.fitness.values
                    del c2.fitness.values

            # mutation
            for mutant in offspring:
                if random.random() < self.mutpb:
                    self.toolbox.mutate(mutant)
                    del mutant.fitness.values

            # evaluate new individuals
            invalid = [ind for ind in offspring if not ind.fitness.valid]
            fitnesses = self.toolbox.map(self.toolbox.evaluate, invalid)

            for ind, fit in zip(invalid, fitnesses):
                ind.fitness.values = fit

            # replace population
            pop[:] = offspring

            if len(halloffame) > 0:
                pop[0] = self.toolbox.clone(halloffame[0])

            halloffame.update(pop)

            current_best = halloffame[0].fitness.values[0]

            # track improvement
            if current_best < best_cost:
                best_cost = current_best
                no_improve = 0
            else:
                no_improve += 1

            fitness_vals = [ind.fitness.values[0] for ind in pop]

            if np.std(fitness_vals) < 0.001 * abs(np.mean(fitness_vals)):
                inject = max(1, int(0.1 * self.population_size))
                for i in range(inject):
                    pop[-(i + 1)] = self.toolbox.individual()

            # early stopping
            if no_improve >= self.patience:
                if verbose:
                    print("Early stopping triggered")

                break

            # checkpoint save
            if checkpoint_path:
                checkpoint = {
                    "population": pop,
                    "generation": gen + 1,
                    "halloffame": halloffame,
                    "rndstate": random.getstate(),
                }

                with open(checkpoint_path, "wb") as file_obj:
                    pickle.dump(checkpoint, file_obj)

            if verbose:
                print(f"Gen {gen} | Best cost {current_best}")

        best_ind = halloffame[0]

        self._repair(best_ind)

        best_params = {name: best_ind[i] for i, name in enumerate(self.param_names)}
        best_cost = best_ind.fitness.values[0]

        if pool:
            pool.close()
            pool.join()

        return {
            "best_parameters": best_params,
            "best_cost": float(best_cost),
        }
