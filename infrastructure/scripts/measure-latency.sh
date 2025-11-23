#!/bin/bash
set -e

API_URL="https://9e4itrdq7c.execute-api.ap-northeast-1.amazonaws.com/dev"
ENDPOINT="$API_URL/todos"

echo "Starting performance test against $ENDPOINT"
echo "------------------------------------------------"

# Function to measure time
measure_request() {
    local method=$1
    local url=$2
    local data=$3
    
    start_time=$(date +%s%N)
    if [ -z "$data" ]; then
        curl -s -o /dev/null -w "%{http_code}" -X $method "$url" > /dev/null
    else
        curl -s -o /dev/null -w "%{http_code}" -X $method -H "Content-Type: application/json" -d "$data" "$url" > /dev/null
    fi
    end_time=$(date +%s%N)
    
    duration=$(( (end_time - start_time) / 1000000 ))
    echo "$duration"
}

# Warm up (Cold Start might happen here)
echo "Warming up (potential cold start)..."
warmup_time=$(measure_request "GET" "$ENDPOINT")
echo "Warmup request time: ${warmup_time}ms"

# Measure Create Todo
echo "Measuring Create Todo..."
create_times=()
for i in {1..5}; do
    time=$(measure_request "POST" "$ENDPOINT" "{\"title\": \"Perf Test $i\"}")
    create_times+=($time)
    echo "Create #$i: ${time}ms"
    sleep 0.5
done

# Measure List Todos
echo "Measuring List Todos..."
list_times=()
for i in {1..5}; do
    time=$(measure_request "GET" "$ENDPOINT")
    list_times+=($time)
    echo "List #$i: ${time}ms"
    sleep 0.5
done

echo "------------------------------------------------"
echo "Performance Test Complete"
