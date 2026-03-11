from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from db.database import get_db
from db.models import Experiment

router = APIRouter(prefix="/experiments", tags=["Experiments"])


@router.get("")
def list_experiments(db: Session = Depends(get_db)):

    experiments = db.query(Experiment).order_by(Experiment.created_at.desc()).all()

    return experiments


@router.get("/{experiment_id}")
def get_experiment(experiment_id: str, db: Session = Depends(get_db)):

    experiment = db.query(Experiment).filter(
        Experiment.id == experiment_id
    ).first()

    return experiment