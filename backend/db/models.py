import uuid
from sqlalchemy import Column, String, Integer, Float, DateTime, ForeignKey, Text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship

from .database import Base


class Experiment(Base):
    __tablename__ = "experiments"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    instrument = Column(String, index=True)
    strategy = Column(String)
    order_side = Column(String)
    quantity = Column(Integer)
    start_time = Column(DateTime)
    end_time = Column(DateTime)
    arrival_price = Column(Float)
    avg_execution_price = Column(Float)
    shortfall = Column(Float)
    total_filled_qty = Column(Integer)
    avg_participation_rate = Column(Float)
    num_slices = Column(Integer)
    seed = Column(Integer)
    worker_count = Column(Integer)
    status = Column(String)
    created_at = Column(DateTime)

    parameters = relationship("StrategyParameter", back_populates="experiment", cascade="all, delete-orphan")
    execution_logs = relationship("ExecutionLogModel", back_populates="experiment", cascade="all, delete-orphan")
    operations = relationship("OperationRecord", back_populates="experiment")


class StrategyParameter(Base):
    __tablename__ = "strategy_parameters"
    id = Column(Integer, primary_key=True, autoincrement=True)
    experiment_id = Column(UUID(as_uuid=True), ForeignKey("experiments.id"))
    parameter_name = Column(String)
    parameter_value = Column(String)

    experiment = relationship("Experiment", back_populates="parameters")


class ExecutionLogModel(Base):
    __tablename__ = "execution_logs"
    id = Column(Integer, primary_key=True, autoincrement=True)
    experiment_id = Column(UUID(as_uuid=True), ForeignKey("experiments.id"))
    sequence_number = Column(Integer)
    timestamp = Column(DateTime)
    filled_qty = Column(Integer)
    market_volume = Column(Integer)
    participation_rate = Column(Float)
    execution_price = Column(Float)

    experiment = relationship("Experiment", back_populates="execution_logs")


class OperationRecord(Base):
    __tablename__ = "operation_records"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    operation_type = Column(String, index=True, nullable=False)
    status = Column(String, nullable=False)
    request_payload = Column(Text, nullable=False)
    response_payload = Column(Text, nullable=False)
    created_at = Column(DateTime, nullable=False)
    experiment_id = Column(UUID(as_uuid=True), ForeignKey("experiments.id"), nullable=True)

    experiment = relationship("Experiment", back_populates="operations")
    explanation_links = relationship(
        "OperationExplanationLink",
        back_populates="operation",
        cascade="all, delete-orphan",
    )


class OperationExplanation(Base):
    __tablename__ = "operation_explanations"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    mode = Column(String, nullable=False)  # summary | question
    question = Column(Text, nullable=True)
    answer = Column(Text, nullable=False)
    created_at = Column(DateTime, nullable=False)

    operation_links = relationship(
        "OperationExplanationLink",
        back_populates="explanation",
        cascade="all, delete-orphan",
    )


class OperationExplanationLink(Base):
    __tablename__ = "operation_explanation_links"

    explanation_id = Column(
        UUID(as_uuid=True),
        ForeignKey("operation_explanations.id"),
        primary_key=True,
    )
    operation_id = Column(
        UUID(as_uuid=True),
        ForeignKey("operation_records.id"),
        primary_key=True,
    )

    explanation = relationship("OperationExplanation", back_populates="operation_links")
    operation = relationship("OperationRecord", back_populates="explanation_links")