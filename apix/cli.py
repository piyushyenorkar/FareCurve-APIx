"""CLI interface for APIx pipeline operations."""
from __future__ import annotations
import asyncio, logging, sys
import typer
from rich.console import Console
from rich.table import Table

app = typer.Typer(name="apix", help="APIx - Real-time Airfare Price Index CLI")
console = Console()
logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(name)s: %(message)s")


@app.command()
def db_init():
    """Create all database tables."""
    from apix.db import init_db
    console.print("[bold green]Creating database tables...[/]")
    init_db()
    console.print("[bold green]Done![/]")


@app.command()
def db_seed():
    """Load seed data (route weights, airport passengers)."""
    from apix.reference.weights import rebuild
    console.print("[bold green]Loading seed data...[/]")
    try:
        rebuild()
        console.print("[bold green]Seed data loaded![/]")
    except Exception as e:
        console.print(f"[red]Error: {e}[/]")


@app.command()
def reference_refresh():
    """Pull latest CPI/WPI/ATF data from MoSPI API."""
    from apix.reference.series import refresh_all
    console.print("[bold cyan]Refreshing reference data from MoSPI...[/]")
    report = refresh_all()
    if report["ok"]:
        console.print("[bold green]All series refreshed![/]")
        for r in report["refreshed"]:
            console.print(f"  {r['key']}: {r['observations']} obs, latest={r['latest']}")
    else:
        console.print("[yellow]Some series failed:[/]")
        for f in report["failed"]:
            console.print(f"  [red]{f['key']}: {f['error']}[/]")


@app.command()
def pipeline_run(
    dry_run: bool = typer.Option(False, help="Clean only, don't store or compute"),
    no_reconstruct: bool = typer.Option(False, help="Skip reconstruction"),
    all_sources: bool = typer.Option(False, help="Scrape all 11 sources (ignores robots.txt)"),
):
    """Full pipeline: scrape -> clean -> store -> compute index."""
    from apix.pipeline.orchestrator import run_pipeline
    console.print("[bold cyan]Starting pipeline run...[/]")
    result = asyncio.run(run_pipeline(
        allowed_only=not all_sources,
        include_reconstruction=not no_reconstruct,
        dry_run=dry_run,
    ))
    console.print(f"[bold green]Pipeline complete![/]")
    console.print(f"  Live quotes: {result.get('live_quotes', 0)}")
    console.print(f"  Reconstructed: {result.get('reconstructed_quotes', 0)}")
    console.print(f"  Cleaned: {result.get('cleaned_quotes', 0)}")
    console.print(f"  Stored: {result.get('stored', 0)}")
    idx = result.get("index", {})
    if idx and idx.get("overall_index"):
        console.print(f"  [bold]APIx = {idx['overall_index']}[/]")


@app.command()
def pipeline_reconstruct():
    """Generate reconstructed fares for gated sources only."""
    from apix.pipeline.reconstruct import generate_reconstructed_fares
    from apix.pipeline.orchestrator import store_quotes, _get_gated_slugs
    import uuid
    console.print("[bold cyan]Generating reconstructed fares...[/]")
    gated = _get_gated_slugs()
    fares = generate_reconstructed_fares(gated)
    quotes = [q.to_dict() for q in fares]
    stored = store_quotes(quotes, str(uuid.uuid4())[:12])
    console.print(f"[bold green]Generated {len(fares)} fares, stored {stored}[/]")


@app.command()
def compute_index():
    """Compute today's APIx from existing data."""
    from apix.index.compute import compute_daily_index
    console.print("[bold cyan]Computing daily index...[/]")
    result = compute_daily_index()
    if result.get("overall_index"):
        console.print(f"[bold green]APIx = {result['overall_index']}[/]")
        console.print(f"  Routes: {result.get('routes_covered', 0)}")
        console.print(f"  Observations: {result.get('total_observations', 0)}")
        conf = result.get("confidence", {})
        console.print(f"  Confidence: {conf.get('score_pct', 0)}%")
    else:
        console.print(f"[yellow]No index computed: {result.get('error', 'unknown')}[/]")


@app.command()
def backtest():
    """Run backtest against DGCA and CPI data."""
    from apix.index.backtest import run_backtest
    console.print("[bold cyan]Running backtest...[/]")
    result = run_backtest()
    for key, data in result.get("benchmarks", {}).items():
        console.print(f"\n[bold]{key}:[/]")
        if "error" in data:
            console.print(f"  [yellow]{data['error']}[/]")
        else:
            console.print(f"  Pearson r: {data.get('pearson_r', 'N/A')}")
            console.print(f"  Direction agree: {data.get('direction_agreement_pct', 'N/A')}%")
            console.print(f"  Verdict: {data.get('verdict', 'N/A')}")


@app.command()
def serve(
    host: str = typer.Option("0.0.0.0", help="Bind host"),
    port: int = typer.Option(8000, help="Bind port"),
    reload: bool = typer.Option(True, help="Auto-reload on code changes"),
):
    """Start the FastAPI server."""
    import uvicorn
    console.print(f"[bold green]Starting APIx server on {host}:{port}...[/]")
    uvicorn.run("apix.api.main:app", host=host, port=port, reload=reload)


@app.command()
def status():
    """Show current system status."""
    from apix.config import settings
    from apix.domain import SOURCES, ROUTE_BASKET, BOOKING_WINDOWS
    table = Table(title="APIx System Status")
    table.add_column("Component", style="cyan")
    table.add_column("Value", style="green")
    table.add_row("Database", "Postgres" if settings.is_postgres else "SQLite")
    table.add_row("Routes", str(len(ROUTE_BASKET)))
    table.add_row("Booking Windows", str(BOOKING_WINDOWS))
    table.add_row("Total Sources", str(len(SOURCES)))
    allowed = sum(1 for s in SOURCES if s.documented_verdict.value == "ALLOW")
    table.add_row("Allowed Sources", str(allowed))
    table.add_row("Gated Sources", str(len(SOURCES) - allowed))
    table.add_row("Respect robots.txt", str(settings.respect_robots))
    console.print(table)


if __name__ == "__main__":
    app()
