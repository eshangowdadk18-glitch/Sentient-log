def aggregation_alias(aggregation: str, metric: str) -> str:
    """
    Generate a deterministic alias for aggregated columns.
    
    Args:
        aggregation: The aggregation function used (e.g., 'count', 'avg', 'sum')
        metric: The column being aggregated (e.g., 'event_id', 'latency_ms')
        
    Returns:
        The canonical alias in the format {aggregation}_{metric}
    """
    return f"{aggregation}_{metric}"
