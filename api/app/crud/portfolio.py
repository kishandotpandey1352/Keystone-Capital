from datetime import date

from sqlalchemy.orm import Session

from shared.models.portfolio import Portfolio, PortfolioPosition


def create_portfolio(db: Session, name: str) -> Portfolio:
    portfolio = Portfolio(name=name)
    db.add(portfolio)
    db.commit()
    db.refresh(portfolio)
    return portfolio


def list_portfolios(db: Session):
    return db.query(Portfolio).order_by(Portfolio.id.desc()).all()


def get_portfolio(db: Session, portfolio_id: int) -> Portfolio | None:
    return db.query(Portfolio).filter(Portfolio.id == portfolio_id).first()


def add_position(
    db: Session,
    portfolio_id: int,
    symbol: str,
    market: str,
    quantity: float,
    buy_price: float,
    buy_date: date,
) -> PortfolioPosition:
    position = PortfolioPosition(
        portfolio_id=portfolio_id,
        symbol=symbol,
        market=market,
        quantity=quantity,
        buy_price=buy_price,
        buy_date=buy_date,
    )
    db.add(position)
    db.commit()
    db.refresh(position)
    return position


def list_positions(db: Session, portfolio_id: int):
    return (
        db.query(PortfolioPosition)
        .filter(PortfolioPosition.portfolio_id == portfolio_id)
        .order_by(PortfolioPosition.id.desc())
        .all()
    )