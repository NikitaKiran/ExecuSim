# optimization/ga_optimizer.py

import random
from typing import Callable, Dict, Any

from deap import base, creator, tools, algorithms


class GAOptimizer:
    """
    Generic Genetic Algorithm optimizer.
    Minimizes a cost metric (e.g., implementation shortfall).
    """

    def __init__(
        self,
        evaluation_function: Callable[[Dict[str, Any]], float],
        param_bounds: Dict[str, tuple],
        population_size: int = 30,
        generations: int = 20,
        seed: int = 42,
    ):
        """
        evaluation_function: function that takes param dict and returns COST (lower is better)
        param_bounds: dict of parameter_name -> (min, max, type)
                      type: "int" or "float"
        """

        self.evaluate_fn = evaluation_function
        self.param_bounds = param_bounds
        self.population_size = population_size
        self.generations = generations
        self.seed = seed

        random.seed(self.seed)

        self.param_names = list(self.param_bounds.keys())

        self._setup_deap()

    # ----------------------------------
    # DEAP SETUP
    # ----------------------------------

    def _setup_deap(self):

        # Avoid duplicate creator errors
        if "FitnessMin" not in creator.__dict__:
            creator.create("FitnessMin", base.Fitness, weights=(-1.0,))
        if "Individual" not in creator.__dict__:
            creator.create("Individual", list, fitness=creator.FitnessMin)

        self.toolbox = base.Toolbox()

        # Register gene generators dynamically
        for name, (low, high, dtype) in self.param_bounds.items():

            if dtype == "int":
                self.toolbox.register(f"attr_{name}", random.randint, low, high)
            elif dtype == "float":
                self.toolbox.register(f"attr_{name}", random.uniform, low, high)
            else:
                raise ValueError("dtype must be 'int' or 'float'")

        attr_generators = [
            getattr(self.toolbox, f"attr_{name}") for name in self.param_names
        ]

        self.toolbox.register(
            "individual",
            tools.initCycle,
            creator.Individual,
            attr_generators,
            n=1,
        )

        self.toolbox.register("population", tools.initRepeat, list, self.toolbox.individual)

        self.toolbox.register("evaluate", self._evaluate)
        self.toolbox.register("mate", tools.cxBlend, alpha=0.5)
        self.toolbox.register("mutate", tools.mutGaussian, mu=0, sigma=0.1, indpb=0.2)
        self.toolbox.register("select", tools.selTournament, tournsize=3)

    # ----------------------------------
    # FITNESS FUNCTION
    # ----------------------------------

    def _evaluate(self, individual):

        individual = self._repair(individual)

        params = {}
        for i, name in enumerate(self.param_names):
            _, _, dtype = self.param_bounds[name]
            if dtype == "int":
                params[name] = int(individual[i])
            else:
                params[name] = float(individual[i])

        cost = self.evaluate_fn(params)
    
        # DEAP maximizes → negate cost
        return (-cost,)

    # ----------------------------------
    # REPAIR CONSTRAINTS
    # ----------------------------------

    def _repair(self, individual):

        for i, name in enumerate(self.param_names):
            low, high, _ = self.param_bounds[name]
            individual[i] = max(low, min(high, individual[i]))

        return individual

    # ----------------------------------
    # RUN OPTIMIZATION
    # ----------------------------------

    def optimize(self):

        population = self.toolbox.population(n=self.population_size)

        stats = tools.Statistics(lambda ind: ind.fitness.values)
        stats.register("avg", lambda fits: sum(f[0] for f in fits) / len(fits))
        stats.register("max", lambda fits: max(f[0] for f in fits))
        stats.register("min", lambda fits: min(f[0] for f in fits))

        population, logbook = algorithms.eaSimple(
            population,
            self.toolbox,
            cxpb=0.7,
            mutpb=0.2,
            ngen=self.generations,
            stats=stats,
            verbose=True,
        )

        best = tools.selBest(population, k=1)[0]

        best_params = {}
        for i, name in enumerate(self.param_names):
            _, _, dtype = self.param_bounds[name]
            if dtype == "int":
                best_params[name] = int(best[i])
            else:
                best_params[name] = float(best[i])

        best_cost = -best.fitness.values[0]

        return {
            "best_parameters": best_params,
            "best_cost": best_cost,
            "logbook": logbook,
        }