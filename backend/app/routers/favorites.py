"""收藏（食堂 / 咖啡店 / 图书馆）CRUD 接口。"""
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import select
from sqlalchemy.orm import Session

from .. import models, schemas
from ..database import get_db

router = APIRouter(prefix="/api/favorites", tags=["收藏"])


@router.get("", response_model=list[schemas.FavoriteOut])
def list_favorites(
    category: str | None = Query(default=None, description="按类别筛选"),
    db: Session = Depends(get_db),
):
    stmt = select(models.Favorite).order_by(
        models.Favorite.rating.desc(), models.Favorite.id.desc()
    )
    if category:
        stmt = stmt.where(models.Favorite.category == category)
    return db.scalars(stmt).all()


@router.post("", response_model=schemas.FavoriteOut, status_code=201)
def create_favorite(payload: schemas.FavoriteCreate, db: Session = Depends(get_db)):
    favorite = models.Favorite(**payload.model_dump())
    db.add(favorite)
    db.commit()
    db.refresh(favorite)
    return favorite


@router.put("/{favorite_id}", response_model=schemas.FavoriteOut)
def update_favorite(
    favorite_id: int, payload: schemas.FavoriteUpdate, db: Session = Depends(get_db)
):
    favorite = db.get(models.Favorite, favorite_id)
    if not favorite:
        raise HTTPException(404, "收藏不存在")
    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(favorite, field, value)
    db.commit()
    db.refresh(favorite)
    return favorite


@router.delete("/{favorite_id}", status_code=204)
def delete_favorite(favorite_id: int, db: Session = Depends(get_db)):
    favorite = db.get(models.Favorite, favorite_id)
    if not favorite:
        raise HTTPException(404, "收藏不存在")
    db.delete(favorite)
    db.commit()
