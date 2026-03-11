# # optimization/ga_optimizer.py

# import random
# from typing import Callable, Dict, Any

# from deap import base, creator, tools, algorithms


# class GAOptimizer:
#     """
#     Generic Genetic Algorithm optimizer.
#     Minimizes a cost metric (e.g., implementation shortfall).
#     """

#     def __init__(
#         self,
#         evaluation_function: Callable[[Dict[str, Any]], float],
#         param_bounds: Dict[str, tuple],
#         population_size: int = 30,
#         generations: int = 20,
#         seed: int = 42,
#     ):
#         """
#         evaluation_function: function that takes param dict and returns COST (lower is better)
#         param_bounds: dict of parameter_name -> (min, max, type)
#                       type: "int" or "float"
#         """

#         self.evaluate_fn = evaluation_function
#         self.param_bounds = param_bounds
#         self.population_size = population_size
#         self.generations = generations
#         self.seed = seed

#         random.seed(self.seed)

#         self.param_names = list(self.param_bounds.keys())

#         self._setup_deap()

#     # ----------------------------------
#     # DEAP SETUP
#     # ----------------------------------

#     def _setup_deap(self):

#         # Avoid duplicate creator errors
#         if "FitnessMin" not in creator.__dict__:
#             creator.create("FitnessMin", base.Fitness, weights=(-1.0,))
#         if "Individual" not in creator.__dict__:
#             creator.create("Individual", list, fitness=creator.FitnessMin)

#         self.toolbox = base.Toolbox()

#         # Register gene generators dynamically
#         for name, (low, high, dtype) in self.param_bounds.items():

#             if dtype == "int":
#                 self.toolbox.register(f"attr_{name}", random.randint, low, high)
#             elif dtype == "float":
#                 self.toolbox.register(f"attr_{name}", random.uniform, low, high)
#             else:
#                 raise ValueError("dtype must be 'int' or 'float'")

#         attr_generators = [
#             getattr(self.toolbox, f"attr_{name}") for name in self.param_names
#         ]

#         self.toolbox.register(
#             "individual",
#             tools.initCycle,
#             creator.Individual,
#             attr_generators,
#             n=1,
#         )

#         self.toolbox.register("population", tools.initRepeat, list, self.toolbox.individual)

#         self.toolbox.register("evaluate", self._evaluate)
#         self.toolbox.register("mate", tools.cxBlend, alpha=0.5)
#         self.toolbox.register("mutate", tools.mutGaussian, mu=0, sigma=0.1, indpb=0.2)
#         self.toolbox.register("select", tools.selTournament, tournsize=3)

#     # ----------------------------------
#     # FITNESS FUNCTION
#     # ----------------------------------

#     def _evaluate(self, individual):

#         individual = self._repair(individual)

#         params = {}
#         for i, name in enumerate(self.param_names):
#             _, _, dtype = self.param_bounds[name]
#             if dtype == "int":
#                 params[name] = int(individual[i])
#             else:
#                 params[name] = float(individual[i])

#         cost = self.evaluate_fn(params)
    
#         # DEAP maximizes → negate cost
#         return (-cost,)

#     # ----------------------------------
#     # REPAIR CONSTRAINTS
#     # ----------------------------------

#     def _repair(self, individual):

#         for i, name in enumerate(self.param_names):
#             low, high, _ = self.param_bounds[name]
#             individual[i] = max(low, min(high, individual[i]))

#         return individual

#     # ----------------------------------
#     # RUN OPTIMIZATION
#     # ----------------------------------

#     def optimize(self):

#         population = self.toolbox.population(n=self.population_size)

#         stats = tools.Statistics(lambda ind: ind.fitness.values)
#         stats.register("avg", lambda fits: sum(f[0] for f in fits) / len(fits))
#         stats.register("max", lambda fits: max(f[0] for f in fits))
#         stats.register("min", lambda fits: min(f[0] for f in fits))

#         population, logbook = algorithms.eaSimple(
#             population,
#             self.toolbox,
#             cxpb=0.7,
#             mutpb=0.2,
#             ngen=self.generations,
#             stats=stats,
#             verbose=True,
#         )

#         best = tools.selBest(population, k=1)[0]

#         best_params = {}
#         for i, name in enumerate(self.param_names):
#             _, _, dtype = self.param_bounds[name]
#             if dtype == "int":
#                 best_params[name] = int(best[i])
#             else:
#                 best_params[name] = float(best[i])

#         best_cost = -best.fitness.values[0]

#         return {
#             "best_parameters": best_params,
#             "best_cost": best_cost,
#             "logbook": logbook,
#         }


# # optimization/ga_optimizer.py
# import random
# import pickle
# from functools import partial
# from typing import Callable, Dict, Any, Tuple, List, Optional

# from deap import base, creator, tools, algorithms
# import numpy as np

# # multiprocessing for parallel fitness evaluation
# from multiprocessing import Pool

# # -------------------------
# # Module-level helper for parallel evaluation (picklable)
# # -------------------------
# # These module-level variables are set inside GAOptimizer.optimize() before starting the Pool.
# _GA_EVAL_FN: Optional[Callable[[Dict[str, Any]], float]] = None
# _GA_PARAM_NAMES: Optional[List[str]] = None
# _GA_PARAM_BOUNDS: Optional[Dict[str, Tuple[float, float, str]]] = None

# def _parallel_eval_wrapper(individual):
#     """
#     Module-level wrapper for parallel evaluation.
#     Expects globals _GA_EVAL_FN, _GA_PARAM_NAMES, _GA_PARAM_BOUNDS to be set.
#     Returns a DEAP-style tuple: ( -cost, )
#     """
#     import numpy as _np  # local import to be safe in worker

#     # Defensive: if globals not set, return large penalty
#     if _GA_EVAL_FN is None or _GA_PARAM_NAMES is None or _GA_PARAM_BOUNDS is None:
#         return (-1e12,)

#     try:
#         # Convert / repair individual into a params dict consistent with bounds/dtypes
#         params = {}
#         for i, name in enumerate(_GA_PARAM_NAMES):
#             low, high, dtype = _GA_PARAM_BOUNDS[name]
#             val = individual[i]
#             if dtype == "int":
#                 v = int(round(val))
#                 v = max(int(low), min(int(high), v))
#             else:
#                 v = float(val)
#                 v = max(float(low), min(float(high), v))
#             params[name] = v

#         # Call the user-supplied evaluation function (must be module-level/picklable)
#         cost = float(_GA_EVAL_FN(params))
#         if not _np.isfinite(cost):
#             cost = 1e12
#     except Exception:
#         # On any exception, return a large penalty so GA avoids this region.
#         cost = 1e12

#     return (-float(cost),)


# class GAOptimizer:
#     """
#     Genetic Algorithm optimizer wrapper around DEAP.

#     Required:
#       - evaluation_function: a callable that accepts a dict of params and returns a scalar cost (float).
#                              IMPORTANT: this must be a module-level/picklable function when using n_workers>1.
#       - param_bounds: dict[param_name] = (low, high, dtype_str) where dtype_str in {"int", "float"}.
#     """

#     def __init__(
#         self,
#         evaluation_function: Callable[[Dict[str, Any]], float],
#         param_bounds: Dict[str, Tuple[float, float, str]],
#         population_size: int = 30,
#         generations: int = 20,
#         seed: int = 42,
#         cxpb: float = 0.7,
#         mutpb: float = 0.2,
#         n_workers: int = 1,
#     ):
#         random.seed(seed)
#         np.random.seed(seed)

#         self.evaluate_fn = evaluation_function
#         self.param_bounds = param_bounds
#         self.param_names = list(param_bounds.keys())
#         self.population_size = population_size
#         self.generations = generations
#         self.cxpb = cxpb
#         self.mutpb = mutpb
#         self.seed = seed
#         # ensure n_workers is an int >= 1
#         self.n_workers = int(n_workers) if n_workers is not None and int(n_workers) >= 1 else 1

#         self._setup_deap()

#     def _setup_deap(self):
#         # create fitness and individual classes
#         # We minimize cost -> use weights = (-1.0,)
#         try:
#             creator.create("FitnessMin", base.Fitness, weights=(-1.0,))
#         except Exception:
#             # creator.create may raise if already created; ignore in that case
#             pass

#         try:
#             creator.create("Individual", list, fitness=creator.FitnessMin)
#         except Exception:
#             pass

#         self.toolbox = base.Toolbox()

#         # register attribute generators for each parameter
#         attr_generators = []
#         for name, (low, high, dtype) in self.param_bounds.items():
#             if dtype == "int":
#                 self.toolbox.register(f"attr_{name}", random.randint, int(low), int(high))
#                 attr_generators.append(getattr(self.toolbox, f"attr_{name}"))
#             else:
#                 # float
#                 self.toolbox.register(f"attr_{name}", random.uniform, float(low), float(high))
#                 attr_generators.append(getattr(self.toolbox, f"attr_{name}"))

#         # initialize individual and population creators
#         # initCycle calls each generator once to form an individual
#         self.toolbox.register("individual", tools.initCycle, creator.Individual, attr_generators, n=1)
#         self.toolbox.register("population", tools.initRepeat, list, self.toolbox.individual)

#         # genetic operators
#         self.toolbox.register("mate", tools.cxBlend, alpha=0.5)
#         self.toolbox.register("mutate", tools.mutGaussian, mu=0, sigma=0.1, indpb=0.2)
#         self.toolbox.register("select", tools.selTournament, tournsize=3)

#         # Default evaluate registration uses the bound method for sequential runs.
#         # For parallel runs, we'll re-register a module-level wrapper inside optimize().
#         self.toolbox.register("evaluate", self._evaluate)

#         # Do not register map here; register map in optimize() after creating Pool if needed
#         # (we will register either pool.map or built-in map in optimize()).

#     def _repair(self, individual):
#         # ensure individuals remain within bounds (in-place)
#         for i, name in enumerate(self.param_names):
#             low, high, dtype = self.param_bounds[name]
#             val = individual[i]
#             if dtype == "int":
#                 val = int(round(val))
#                 val = max(int(low), min(int(high), val))
#             else:
#                 val = float(val)
#                 val = max(float(low), min(float(high), val))
#             individual[i] = val
#         return individual

#     def _evaluate(self, individual):
#         """
#         DEAP evaluation wrapper. Converts individual -> param dict and calls user eval function.
#         Returns a tuple (-cost,) because DEAP maximizes fitness but we want to minimize cost.
#         This bound-method wrapper is fine for single-process evaluation.
#         """
#         # repair bounds first
#         self._repair(individual)

#         params = {name: individual[i] for i, name in enumerate(self.param_names)}

#         try:
#             cost = float(self.evaluate_fn(params))
#             # In very rare cases evaluation may return NaN or inf; treat as bad solution
#             if not np.isfinite(cost):
#                 cost = 1e12
#         except Exception as e:
#             # If eval fails, return a large penalty so GA avoids this region.
#             print(f"[GAOptimizer] evaluation error for params {params}: {e}")
#             cost = 1e12

#         # DEAP expects a tuple
#         return (-float(cost),)  # negative because we created FitnessMin with weight -1.0

#     def optimize(self, verbose: bool = True, checkpoint_path: Optional[str] = None):
#         """
#         Run the GA optimization.

#         If n_workers > 1, we spawn a multiprocessing.Pool and register pool.map to toolbox.
#         After the run, the pool is closed and joined.

#         Returns:
#           dict with keys: best_parameters (dict), best_cost (float), logbook (deap.tools.Logbook)
#         """
#         # create population
#         pop = self.toolbox.population(n=self.population_size)

#         # register map function: if parallel requested, create Pool and register pool.map
#         pool = None
#         original_map = None
#         try:
#             if self.n_workers and self.n_workers > 1:
#                 # Prepare module-level globals so the top-level wrapper can access them in worker processes
#                 global _GA_EVAL_FN, _GA_PARAM_NAMES, _GA_PARAM_BOUNDS
#                 _GA_EVAL_FN = self.evaluate_fn
#                 _GA_PARAM_NAMES = self.param_names
#                 _GA_PARAM_BOUNDS = self.param_bounds

#                 pool = Pool(processes=self.n_workers)
#                 # attach pool.map to toolbox
#                 original_map = getattr(self.toolbox, "map", None)
#                 # Register a picklable module-level evaluate wrapper and set pool.map as map
#                 # Overwrites previous evaluate registration only for parallel case
#                 self.toolbox.register("evaluate", _parallel_eval_wrapper)
#                 self.toolbox.register("map", pool.map)
#             else:
#                 # ensure toolbox has a map (sequential)
#                 self.toolbox.register("map", map)
#         except Exception as e:
#             # fallback to sequential map if pool creation fails
#             print(f"[GAOptimizer] Could not create Pool (n_workers={self.n_workers}): {e}. Falling back to sequential map.")
#             self.toolbox.register("map", map)
#             if pool:
#                 pool.close()
#                 pool = None

#         # statistics
#         stats = tools.Statistics(lambda ind: ind.fitness.values)
#         stats.register("avg", lambda fits: float(np.mean([fv[0] for fv in fits])))
#         stats.register("std", lambda fits: float(np.std([fv[0] for fv in fits])))
#         stats.register("min", lambda fits: float(np.min([fv[0] for fv in fits])))
#         stats.register("max", lambda fits: float(np.max([fv[0] for fv in fits])))

#         # run the GA
#         logbook = tools.Logbook()
#         logbook.header = ["gen", "nevals"] + (stats.fields if hasattr(stats, "fields") else list(stats._fields))

#         pop, logbook = algorithms.eaSimple(
#             pop,
#             self.toolbox,
#             cxpb=self.cxpb,
#             mutpb=self.mutpb,
#             ngen=self.generations,
#             stats=stats,
#             verbose=verbose,
#         )

#         # select best individual
#         best_ind = tools.selBest(pop, k=1)[0]
#         # repair to ensure it's within bounds
#         self._repair(best_ind)
#         best_params = {name: best_ind[i] for i, name in enumerate(self.param_names)}
#         best_cost = -best_ind.fitness.values[0]

#         # cleanup pool
#         if pool:
#             try:
#                 pool.close()
#                 pool.join()
#             except Exception:
#                 pass

#         return {"best_parameters": best_params, "best_cost": float(best_cost), "logbook": logbook}


# import random
# import pickle
# import os
# from typing import Callable, Dict, Any, Tuple, List, Optional

# from deap import base, creator, tools
# import numpy as np
# from multiprocessing import Pool

# # ------------------------------------------------------------
# # Globals used for multiprocessing evaluation
# # Workers cannot easily access class methods, so we expose
# # the evaluation function and parameter metadata globally.
# # ------------------------------------------------------------

# _GA_EVAL_FN = None
# _GA_PARAM_NAMES = None
# _GA_PARAM_BOUNDS = None

# def _init_worker(eval_fn, param_names, param_bounds):
#     """
#     Pool initializer: runs once in each worker process to set globals.
#     Required on macOS/Windows where 'spawn' start method is used and
#     globals from the parent process are NOT inherited by workers.
#     """
#     global _GA_EVAL_FN, _GA_PARAM_NAMES, _GA_PARAM_BOUNDS
#     _GA_EVAL_FN = eval_fn
#     _GA_PARAM_NAMES = param_names
#     _GA_PARAM_BOUNDS = param_bounds

# def _parallel_eval_wrapper(individual):
#     """
#     Wrapper used by multiprocessing workers.

#     Converts a GA individual (list of parameters) into
#     a parameter dictionary and calls the evaluation
#     function.

#     Returns DEAP fitness tuple: (-cost,) because DEAP
#     maximizes fitness while we want to minimize cost.
#     """

#     import numpy as _np

#     if _GA_EVAL_FN is None:
#         return (1e12,)

#     try:

#         params = {}

#         for i, name in enumerate(_GA_PARAM_NAMES):

#             low, high, dtype = _GA_PARAM_BOUNDS[name]
#             val = individual[i]

#             # ensure value respects bounds and datatype
#             if dtype == "int":
#                 v = int(round(val))
#                 v = max(int(low), min(int(high), v))
#             else:
#                 v = float(val)
#                 v = max(float(low), min(float(high), v))

#             params[name] = v

#         cost = float(_GA_EVAL_FN(params))

#         if not _np.isfinite(cost):
#             cost = 1e12

#     except Exception:

#         cost = 1e12

#     return (float(cost),)


# class GAOptimizer:

#     """
#     Genetic Algorithm optimizer using DEAP.

#     Goal:
#     Minimize a cost metric (e.g., implementation shortfall)
#     by evolving parameters such as slice frequency,
#     participation cap, aggressiveness etc.

#     Improvements implemented:

#     • Elitism (HallOfFame) – best solution never lost
#     • Adaptive mutation rate – exploration early, refinement later
#     • Bounded mutation – parameters always remain valid
#     • Diversity injection – prevents premature convergence
#     • Early stopping – stop if no improvement
#     • Checkpointing – resume long optimizations
#     • Warm start – seed good parameters
#     • Parallel evaluation – faster simulations
#     """

#     def __init__(
#         self,
#         evaluation_function: Callable[[Dict[str, Any]], float],
#         param_bounds: Dict[str, Tuple[float, float, str]],
#         population_size: int = 40,
#         generations: int = 25,
#         seed: int = 42,
#         cxpb: float = 0.7,
#         mutpb: float = 0.25,
#         n_workers: int = 1,
#         patience: int = 10,
#     ):

#         # random seeds for reproducibility
#         random.seed(seed)
#         np.random.seed(seed)

#         self.evaluate_fn = evaluation_function
#         self.param_bounds = param_bounds
#         self.param_names = list(param_bounds.keys())

#         self.population_size = population_size
#         self.generations = generations

#         # crossover probability
#         self.cxpb = cxpb

#         # mutation probability (adaptive during evolution)
#         self.initial_mutpb = mutpb
#         self.mutpb = mutpb

#         self.seed = seed

#         # multiprocessing workers
#         self.n_workers = max(1, int(n_workers))

#         # early stopping patience
#         self.patience = patience

#         self._setup_deap()

#     # ------------------------------------------------------------
#     # GA SETUP
#     # ------------------------------------------------------------

#     def _setup_deap(self):

#         # Avoid duplicate DEAP class creation errors
#         if "FitnessMin" not in creator.__dict__:
#             creator.create("FitnessMin", base.Fitness, weights=(-1.0,))

#         if "Individual" not in creator.__dict__:
#             creator.create("Individual", list, fitness=creator.FitnessMin)

#         self.toolbox = base.Toolbox()

#         attr_generators = []

#         # Register attribute generators for each parameter
#         for name, (low, high, dtype) in self.param_bounds.items():

#             if dtype == "int":
#                 self.toolbox.register(
#                     f"attr_{name}", random.randint, int(low), int(high)
#                 )

#             else:
#                 self.toolbox.register(
#                     f"attr_{name}", random.uniform, float(low), float(high)
#                 )

#             attr_generators.append(getattr(self.toolbox, f"attr_{name}"))

#         # Individual = list of parameter values
#         self.toolbox.register(
#             "individual",
#             tools.initCycle,
#             creator.Individual,
#             attr_generators,
#             n=1,
#         )

#         # Population = list of individuals
#         self.toolbox.register("population", tools.initRepeat, list, self.toolbox.individual)

#         # Crossover operator (blends parameter values)
#         self.toolbox.register("mate", tools.cxBlend, alpha=0.5)

#         # Mutation operator with bounds
#         lows = [v[0] for v in self.param_bounds.values()]
#         highs = [v[1] for v in self.param_bounds.values()]

#         self.toolbox.register(
#             "mutate",
#             tools.mutPolynomialBounded,
#             eta=10,  # smaller = larger mutations
#             low=lows,
#             up=highs,
#             indpb=0.2,
#         )

#         # Selection operator
#         self.toolbox.register("select", tools.selTournament, tournsize=3)

#         # Evaluation function
#         self.toolbox.register("evaluate", self._evaluate)

#     # ------------------------------------------------------------

#     def _repair(self, individual):

#         """
#         Ensures parameter values stay inside bounds.
#         Useful after crossover/mutation.
#         """

#         for i, name in enumerate(self.param_names):

#             low, high, dtype = self.param_bounds[name]
#             val = individual[i]

#             if dtype == "int":
#                 val = int(round(val))
#                 val = max(int(low), min(int(high), val))

#             else:
#                 val = float(val)
#                 val = max(float(low), min(float(high), val))

#             individual[i] = val

#         return individual

#     # ------------------------------------------------------------

#     def _evaluate(self, individual):

#         """
#         Converts individual -> parameter dictionary
#         and calls user evaluation function.
#         """

#         self._repair(individual)

#         params = {name: individual[i] for i, name in enumerate(self.param_names)}

#         try:

#             cost = float(self.evaluate_fn(params))

#             if not np.isfinite(cost):
#                 cost = 1e12

#         # except Exception:

#         #     cost = 1e12

#         except Exception as e:

#            print("GA evaluation failed for params:", params)
#            print("Error:", e)

#            cost = 1e12

#         return (cost,)

#     # ------------------------------------------------------------

#     def optimize(self, verbose: bool = True, checkpoint_path: Optional[str] = None):

#         """
#         Runs the full genetic algorithm optimization.
#         """

#         # ------------------------------------------------------------
#         # Checkpoint loading
#         # ------------------------------------------------------------

#         if checkpoint_path and os.path.exists(checkpoint_path):

#             with open(checkpoint_path, "rb") as f:
#                 checkpoint = pickle.load(f)

#             pop = checkpoint["population"]
#             start_gen = checkpoint["generation"]
#             halloffame = checkpoint["halloffame"]

#             random.setstate(checkpoint["rndstate"])

#         else:

#             pop = self.toolbox.population(n=self.population_size)
#             start_gen = 0

#             halloffame = tools.HallOfFame(1)

#         # Optional warm start individual
#         if hasattr(self, "seed_individual"):
#             pop[0] = creator.Individual(self.seed_individual)

#         # ------------------------------------------------------------
#         # Multiprocessing setup
#         # ------------------------------------------------------------

#         pool = None

#         if self.n_workers > 1:

#             global _GA_EVAL_FN, _GA_PARAM_NAMES, _GA_PARAM_BOUNDS

#             _GA_EVAL_FN = self.evaluate_fn
#             _GA_PARAM_NAMES = self.param_names
#             _GA_PARAM_BOUNDS = self.param_bounds

#             pool = Pool(
#                 self.n_workers,
#                 initializer=_init_worker,
#                 initargs=(self.evaluate_fn, self.param_names, self.param_bounds),
#             )

#             self.toolbox.register("evaluate", _parallel_eval_wrapper)
#             self.toolbox.register("map", pool.map)

#         else:

#             self.toolbox.register("map", map)

#         # ------------------------------------------------------------
#         # Evaluate initial population
#         # ------------------------------------------------------------

#         fitnesses = list(self.toolbox.map(self.toolbox.evaluate, pop))

#         for ind, fit in zip(pop, fitnesses):
#             ind.fitness.values = fit

#         halloffame.update(pop)

#         best_cost = float("inf")
#         no_improve = 0

#         # ------------------------------------------------------------
#         # Evolution loop
#         # ------------------------------------------------------------

#         for gen in range(start_gen, self.generations):

#             # adaptive mutation rate
#             self.mutpb = max(0.05, self.initial_mutpb * (1 - gen / self.generations))

#             # selection
#             offspring = self.toolbox.select(pop, len(pop))
#             offspring = list(map(self.toolbox.clone, offspring))

#             # crossover
#             for c1, c2 in zip(offspring[::2], offspring[1::2]):

#                 if random.random() < self.cxpb:

#                     self.toolbox.mate(c1, c2)

#                     del c1.fitness.values
#                     del c2.fitness.values

#             # mutation
#             for mutant in offspring:

#                 if random.random() < self.mutpb:

#                     self.toolbox.mutate(mutant)

#                     del mutant.fitness.values

#             # evaluate new individuals
#             invalid = [ind for ind in offspring if not ind.fitness.valid]

#             fitnesses = self.toolbox.map(self.toolbox.evaluate, invalid)

#             for ind, fit in zip(invalid, fitnesses):
#                 ind.fitness.values = fit

#             # replace population
#             pop[:] = offspring

#             # ensure elite survives
#             pop[0] = self.toolbox.clone(halloffame[0])

#             halloffame.update(pop)

#             current_best = halloffame[0].fitness.values[0]

#             # track improvement
#             if current_best < best_cost:
#                 best_cost = current_best
#                 no_improve = 0

#             else:
#                 no_improve += 1

#             # ------------------------------------------------------------
#             # Diversity injection (replace only few individuals)
#             # ------------------------------------------------------------

#             fitness_vals = [ind.fitness.values[0] for ind in pop]

#             if np.std(fitness_vals) < 0.001 * abs(np.mean(fitness_vals)):

#                 inject = max(1, int(0.1 * self.population_size))

#                 for i in range(inject):
#                     pop[-(i + 1)] = self.toolbox.individual()

#             # early stopping
#             if no_improve >= self.patience:

#                 if verbose:
#                     print("Early stopping triggered")

#                 break

#             # checkpoint save
#             if checkpoint_path:

#                 checkpoint = {
#                     "population": pop,
#                     "generation": gen,
#                     "halloffame": halloffame,
#                     "rndstate": random.getstate(),
#                 }

#                 with open(checkpoint_path, "wb") as f:
#                     pickle.dump(checkpoint, f)

#             if verbose:
#                 print(f"Gen {gen} | Best cost {current_best}")

#         # ------------------------------------------------------------
#         # Final best solution
#         # ------------------------------------------------------------

#         best_ind = halloffame[0]

#         self._repair(best_ind)

#         best_params = {name: best_ind[i] for i, name in enumerate(self.param_names)}

#         best_cost = best_ind.fitness.values[0]

#         if pool:
#             pool.close()
#             pool.join()

#         return {
#             "best_parameters": best_params,
#             "best_cost": float(best_cost),
#         }

# # optimization/ga_optimizer.py

# import random
# from typing import Callable, Dict, Any

# from deap import base, creator, tools, algorithms


# class GAOptimizer:
#     """
#     Generic Genetic Algorithm optimizer.
#     Minimizes a cost metric (e.g., implementation shortfall).
#     """

#     def __init__(
#         self,
#         evaluation_function: Callable[[Dict[str, Any]], float],
#         param_bounds: Dict[str, tuple],
#         population_size: int = 30,
#         generations: int = 20,
#         seed: int = 42,
#     ):
#         """
#         evaluation_function: function that takes param dict and returns COST (lower is better)
#         param_bounds: dict of parameter_name -> (min, max, type)
#                       type: "int" or "float"
#         """

#         self.evaluate_fn = evaluation_function
#         self.param_bounds = param_bounds
#         self.population_size = population_size
#         self.generations = generations
#         self.seed = seed

#         random.seed(self.seed)

#         self.param_names = list(self.param_bounds.keys())

#         self._setup_deap()

#     # ----------------------------------
#     # DEAP SETUP
#     # ----------------------------------

#     def _setup_deap(self):

#         # Avoid duplicate creator errors
#         if "FitnessMin" not in creator.__dict__:
#             creator.create("FitnessMin", base.Fitness, weights=(-1.0,))
#         if "Individual" not in creator.__dict__:
#             creator.create("Individual", list, fitness=creator.FitnessMin)

#         self.toolbox = base.Toolbox()

#         # Register gene generators dynamically
#         for name, (low, high, dtype) in self.param_bounds.items():

#             if dtype == "int":
#                 self.toolbox.register(f"attr_{name}", random.randint, low, high)
#             elif dtype == "float":
#                 self.toolbox.register(f"attr_{name}", random.uniform, low, high)
#             else:
#                 raise ValueError("dtype must be 'int' or 'float'")

#         attr_generators = [
#             getattr(self.toolbox, f"attr_{name}") for name in self.param_names
#         ]

#         self.toolbox.register(
#             "individual",
#             tools.initCycle,
#             creator.Individual,
#             attr_generators,
#             n=1,
#         )

#         self.toolbox.register("population", tools.initRepeat, list, self.toolbox.individual)

#         self.toolbox.register("evaluate", self._evaluate)
#         self.toolbox.register("mate", tools.cxBlend, alpha=0.5)
#         self.toolbox.register("mutate", tools.mutGaussian, mu=0, sigma=0.1, indpb=0.2)
#         self.toolbox.register("select", tools.selTournament, tournsize=3)

#     # ----------------------------------
#     # FITNESS FUNCTION
#     # ----------------------------------

#     def _evaluate(self, individual):

#         individual = self._repair(individual)

#         params = {}
#         for i, name in enumerate(self.param_names):
#             _, _, dtype = self.param_bounds[name]
#             if dtype == "int":
#                 params[name] = int(individual[i])
#             else:
#                 params[name] = float(individual[i])

#         cost = self.evaluate_fn(params)
    
#         # DEAP maximizes → negate cost
#         return (-cost,)

#     # ----------------------------------
#     # REPAIR CONSTRAINTS
#     # ----------------------------------

#     def _repair(self, individual):

#         for i, name in enumerate(self.param_names):
#             low, high, _ = self.param_bounds[name]
#             individual[i] = max(low, min(high, individual[i]))

#         return individual

#     # ----------------------------------
#     # RUN OPTIMIZATION
#     # ----------------------------------

#     def optimize(self):

#         population = self.toolbox.population(n=self.population_size)

#         stats = tools.Statistics(lambda ind: ind.fitness.values)
#         stats.register("avg", lambda fits: sum(f[0] for f in fits) / len(fits))
#         stats.register("max", lambda fits: max(f[0] for f in fits))
#         stats.register("min", lambda fits: min(f[0] for f in fits))

#         population, logbook = algorithms.eaSimple(
#             population,
#             self.toolbox,
#             cxpb=0.7,
#             mutpb=0.2,
#             ngen=self.generations,
#             stats=stats,
#             verbose=True,
#         )

#         best = tools.selBest(population, k=1)[0]

#         best_params = {}
#         for i, name in enumerate(self.param_names):
#             _, _, dtype = self.param_bounds[name]
#             if dtype == "int":
#                 best_params[name] = int(best[i])
#             else:
#                 best_params[name] = float(best[i])

#         best_cost = -best.fitness.values[0]

#         return {
#             "best_parameters": best_params,
#             "best_cost": best_cost,
#             "logbook": logbook,
#         }


# # optimization/ga_optimizer.py


import random
import pickle
import os
from typing import Callable, Dict, Any, Tuple, List, Optional

from deap import base, creator, tools
import numpy as np
from multiprocessing import Pool

# ------------------------------------------------------------
# Globals used for multiprocessing evaluation
# Workers cannot easily access class methods, so we expose
# the evaluation function and parameter metadata globally.
# ------------------------------------------------------------

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

    import numpy as _np

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

        if not _np.isfinite(cost):
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

    # ------------------------------------------------------------
    # GA SETUP
    # ------------------------------------------------------------

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
                self.toolbox.register(
                    f"attr_{name}", random.randint, int(low), int(high)
                )

            else:
                self.toolbox.register(
                    f"attr_{name}", random.uniform, float(low), float(high)
                )

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
            eta=10,  # smaller = larger mutations
            low=lows,
            up=highs,
            indpb=0.2,
        )

        # Selection operator
        self.toolbox.register("select", tools.selTournament, tournsize=3)

        # Evaluation function
        self.toolbox.register("evaluate", self._evaluate)

    # ------------------------------------------------------------

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

    # ------------------------------------------------------------

    def _evaluate(self, individual):

        """
        Converts individual -> parameter dictionary
        and calls user evaluation function.
        """

        self._repair(individual)

        params = {name: individual[i] for i, name in enumerate(self.param_names)}

        try:

            cost = float(self.evaluate_fn(params))

            if not np.isfinite(cost):
                cost = 1e12

        # except Exception:

        #     cost = 1e12

        except Exception as e:

           print("GA evaluation failed for params:", params)
           print("Error:", e)

           cost = 1e12

        # weights=(-1.0,) in FitnessMin means DEAP already negates internally to minimize.
        # So we return (cost,) directly — NOT (-cost,).
        return (cost,)

    # ------------------------------------------------------------

    def optimize(self, verbose: bool = True, checkpoint_path: Optional[str] = None):

        """
        Runs the full genetic algorithm optimization.
        """

        # ------------------------------------------------------------
        # Checkpoint loading
        # ------------------------------------------------------------

        if checkpoint_path and os.path.exists(checkpoint_path):

            with open(checkpoint_path, "rb") as f:
                checkpoint = pickle.load(f)

            pop = checkpoint["population"]
            start_gen = checkpoint["generation"]
            halloffame = checkpoint["halloffame"]

            random.setstate(checkpoint["rndstate"])

        else:

            pop = self.toolbox.population(n=self.population_size)
            start_gen = 0

            halloffame = tools.HallOfFame(1)

        # Optional warm start individual
        if hasattr(self, "seed_individual"):
            pop[0] = creator.Individual(self.seed_individual)

        # ------------------------------------------------------------
        # Multiprocessing setup
        # ------------------------------------------------------------

        pool = None

        if self.n_workers > 1:

            global _GA_EVAL_FN, _GA_PARAM_NAMES, _GA_PARAM_BOUNDS

            _GA_EVAL_FN = self.evaluate_fn
            _GA_PARAM_NAMES = self.param_names
            _GA_PARAM_BOUNDS = self.param_bounds

            # Use initializer to push globals into each worker process.
            # On macOS/Windows (spawn start method), globals set in the main
            # process are NOT inherited by workers — initializer fixes this.
            pool = Pool(
                self.n_workers,
                initializer=_init_worker,
                initargs=(self.evaluate_fn, self.param_names, self.param_bounds),
            )

            self.toolbox.register("evaluate", _parallel_eval_wrapper)
            self.toolbox.register("map", pool.map)

        else:

            self.toolbox.register("map", map)

        # ------------------------------------------------------------
        # Evaluate initial population
        # ------------------------------------------------------------

        fitnesses = list(self.toolbox.map(self.toolbox.evaluate, pop))

        for ind, fit in zip(pop, fitnesses):
            ind.fitness.values = fit

        halloffame.update(pop)

        best_cost = float("inf")
        no_improve = 0

        # ------------------------------------------------------------
        # Evolution loop
        # ------------------------------------------------------------

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

            # ensure elite survives
            pop[0] = self.toolbox.clone(halloffame[0])

            halloffame.update(pop)

            current_best = halloffame[0].fitness.values[0]

            # track improvement
            if current_best < best_cost:
                best_cost = current_best
                no_improve = 0

            else:
                no_improve += 1

            # ------------------------------------------------------------
            # Diversity injection (replace only few individuals)
            # ------------------------------------------------------------

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
                    "generation": gen,
                    "halloffame": halloffame,
                    "rndstate": random.getstate(),
                }

                with open(checkpoint_path, "wb") as f:
                    pickle.dump(checkpoint, f)

            if verbose:
                print(f"Gen {gen} | Best cost {current_best}")

        # ------------------------------------------------------------
        # Final best solution
        # ------------------------------------------------------------

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
