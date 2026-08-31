"""
Populate ClickHouse with test event data to test the latency dashboard.

Usage:
    python3 tests/populate_test_data.py

This will insert sample events with latency data into ClickHouse.
"""

import sys
import asyncio
from pathlib import Path
from datetime import datetime, timedelta
import json
import random

# Add project root to path
sys.path.insert(0, str(Path(__file__).parent.parent))

from app.clickhouse.client import get_client


async def populate_test_data():
    """Insert test events with latency data into ClickHouse."""
    client = await get_client()
    
    # Create events table if it doesn't exist
    create_table_sql = """
    CREATE TABLE IF NOT EXISTS events (
        event_id UUID,
        timestamp DateTime,
        event_type String,
        url String,
        latency_ms Int32,
        user_agent String,
        metadata JSON
    ) ENGINE = MergeTree() ORDER BY (timestamp, event_id)
    """
    
    try:
        await client.command(create_table_sql)
        print("✓ Events table created/verified")
    except Exception as e:
        print(f"! Events table already exists: {e}")
    
    # Generate test event data
    events = []
    now = datetime.utcnow()
    
    services = ["auth-service", "payment-service", "user-service", "api-gateway"]
    endpoints = ["/login", "/register", "/checkout", "/profile", "/health"]
    statuses = [200, 201, 400, 401, 403, 500, 502, 503]
    environments = ["production", "staging", "development"]
    regions = ["us-east-1", "us-west-2", "eu-west-1"]
    methods = ["GET", "POST", "PUT", "DELETE", "PATCH"]
    
    # Create events for the last hour with varying latency
    for i in range(200):
        # Random time in the last hour
        minutes_ago = random.randint(0, 59)
        event_time = now - timedelta(minutes=minutes_ago)
        
        # Generate realistic latency values
        service = random.choice(services)
        is_error = random.random() < 0.15  # 15% error rate
        base_latency = random.randint(50, 500)
        
        if is_error:
            latency = random.randint(1000, 5000)  # Slow errors
            status = random.choice([500, 502, 503])
        else:
            latency = base_latency
            status = random.choice([200, 201])
        
        event = {
            "event_id": f"550e8400-e29b-41d4-a716-{i:012d}",
            "timestamp": event_time.isoformat() + "Z",
            "event_type": "http_request",
            "url": f"{random.choice(endpoints)}",
            "latency_ms": latency,
            "user_agent": "Mozilla/5.0",
            "metadata": json.dumps({
                "service": service,
                "status_code": str(status),
                "endpoint": random.choice(endpoints),
                "environment": random.choice(environments),
                "method": random.choice(methods),
                "host": "api.example.com",
                "region": random.choice(regions),
            })
        }
        events.append(event)
    
    # Insert events in batch
    insert_sql = """
    INSERT INTO events (event_id, timestamp, event_type, url, latency_ms, user_agent, metadata)
    VALUES
    """
    
    values_parts = []
    for event in events:
        values_parts.append(f"""(
            '{event["event_id"]}',
            '{event["timestamp"]}',
            '{event["event_type"]}',
            '{event["url"]}',
            {event["latency_ms"]},
            '{event["user_agent"]}',
            '{event["metadata"]}'
        )""")
    
    insert_sql += ",\n".join(values_parts)
    
    try:
        await client.command(insert_sql)
        print(f"✓ Inserted {len(events)} test events into ClickHouse")
        print(f"  - Latency range: 50ms - 5000ms")
        print(f"  - Time range: last 60 minutes")
        print(f"  - Services: {', '.join(services)}")
    except Exception as e:
        print(f"✗ Error inserting events: {e}")
        raise


async def verify_data():
    """Verify test data was inserted correctly."""
    client = await get_client()
    
    # Count total events
    count_result = await client.query("SELECT count(*) as count FROM events")
    if count_result.result_rows:
        count = count_result.result_rows[0][0]
        print(f"\n✓ Total events in database: {count}")
    
    # Check latency data
    latency_result = await client.query("""
        SELECT
            toStartOfMinute(timestamp) as minute,
            count(*) as event_count,
            avg(latency_ms) as avg_latency,
            max(latency_ms) as max_latency,
            min(latency_ms) as min_latency
        FROM events
        WHERE timestamp >= now() - INTERVAL 60 MINUTE
        GROUP BY minute
        ORDER BY minute DESC
        LIMIT 5
    """)
    
    if latency_result.result_rows:
        print(f"\n✓ Recent latency data (last 5 minutes):")
        for row in latency_result.result_rows:
            print(f"  - {row[0]}: avg={row[2]:.0f}ms, min={row[4]:.0f}ms, max={row[3]:.0f}ms, count={row[1]}")
    
    print("\n✓ Test data population complete!")
    print("\nYou can now:")
    print("  1. Run: npm run dev (in frontend)")
    print("  2. Go to Dashboard")
    print("  3. The 'Latency Trend' chart should now show data")


async def main():
    print("\n=== Populating ClickHouse with Test Event Data ===\n")
    await populate_test_data()
    await verify_data()


if __name__ == "__main__":
    try:
        asyncio.run(main())
    except Exception as e:
        print(f"\n✗ Error: {e}")
        sys.exit(1)
