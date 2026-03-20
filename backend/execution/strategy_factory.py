from __future__ import annotations

from dataclasses import dataclass
from typing import Any, Dict, Type

from execution.strategies import Strategy, TWAPStrategy, VWAPStrategy


@dataclass(frozen=True)
class StrategySpec:
    name: str
    strategy_cls: Type[Strategy]
    description: str


class StrategyFactory:
    _registry: Dict[str, StrategySpec] = {
        "TWAP": StrategySpec(
            name="TWAP",
            strategy_cls=TWAPStrategy,
            description="Time Weighted Average Price - splits order evenly across time.",
        ),
        "VWAP": StrategySpec(
            name="VWAP",
            strategy_cls=VWAPStrategy,
            description="Volume Weighted Average Price - allocates proportionally to volume.",
        ),
    }

    _param_aliases: Dict[str, Dict[str, str]] = {
        "VWAP": {
            "participation_cap": "volume_participation_cap",
        }
    }

    @classmethod
    def register(cls, name: str, strategy_cls: Type[Strategy], description: str = "Registered execution strategy.") -> None:
        normalized = name.upper()
        cls._registry[normalized] = StrategySpec(
            name=normalized,
            strategy_cls=strategy_cls,
            description=description,
        )

    @classmethod
    def available_strategies(cls) -> list[str]:
        return sorted(cls._registry.keys())

    @classmethod
    def list_strategies(cls) -> list[dict[str, str]]:
        return [
            {
                "name": spec.name,
                "description": spec.description,
            }
            for _, spec in sorted(cls._registry.items())
        ]

    @classmethod
    def create(cls, name: str, params: Dict[str, Any] | None = None) -> Strategy:
        strategy_name = name.upper()
        spec = cls._registry.get(strategy_name)

        if spec is None:
            available = ", ".join(cls.available_strategies())
            raise ValueError(f"Unknown strategy: {name}. Available: {available}")

        kwargs = dict(params or {})
        aliases = cls._param_aliases.get(strategy_name, {})
        for source, target in aliases.items():
            if source in kwargs and target not in kwargs:
                kwargs[target] = kwargs.pop(source)

        try:
            return spec.strategy_cls(**kwargs)
        except TypeError:
            strategy = spec.strategy_cls()
            for key, value in kwargs.items():
                setattr(strategy, key, value)
            return strategy