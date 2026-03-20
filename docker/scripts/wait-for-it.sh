#!/usr/bin/env bash
# wait-for-it.sh - Wait for a service to be ready

set -e

TIMEOUT=30
QUIET=0
HOST=""
PORT=""

usage() {
    echo "Usage: $0 host:port [-t timeout] [-q]"
    echo "  -h HOST | --host=HOST       Host or IP to check"
    echo "  -p PORT | --port=PORT       Port to check"
    echo "  -t TIMEOUT | --timeout=TIMEOUT"
    echo "                              Timeout in seconds, zero for no timeout"
    echo "  -q | --quiet                Don't output any status messages"
    echo "  -- COMMAND ARGS             Execute command with args after the test finishes"
    exit 1
}

wait_for() {
    if [[ $TIMEOUT -gt 0 ]]; then
        echoerr "$0: waiting $TIMEOUT seconds for $HOST:$PORT"
    else
        echoerr "$0: waiting for $HOST:$PORT without a timeout"
    fi

    start_ts=$(date +%s)
    while :; do
        if nc -z "$HOST" "$PORT" >/dev/null 2>&1; then
            end_ts=$(date +%s)
            echoerr "$0: $HOST:$PORT is available after $((end_ts - start_ts)) seconds"
            break
        fi
        sleep 1
        if [[ $TIMEOUT -gt 0 ]]; then
            cur_ts=$(date +%s)
            if [[ $((cur_ts - start_ts)) -ge $TIMEOUT ]]; then
                echoerr "$0: timeout occurred after waiting $TIMEOUT seconds for $HOST:$PORT"
                exit 124
            fi
        fi
    done
    return 0
}

echoerr() {
    if [[ $QUIET -ne 1 ]]; then
        echo "$@" 1>&2
    fi
}

# Process arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        *:*)
            HOST=$(echo $1 | cut -d: -f1)
            PORT=$(echo $1 | cut -d: -f2)
            shift
            ;;
        -h|--host)
            HOST="$2"
            shift 2
            ;;
        --host=*)
            HOST="${1#*=}"
            shift
            ;;
        -p|--port)
            PORT="$2"
            shift 2
            ;;
        --port=*)
            PORT="${1#*=}"
            shift
            ;;
        -t|--timeout)
            TIMEOUT="$2"
            shift 2
            ;;
        --timeout=*)
            TIMEOUT="${1#*=}"
            shift
            ;;
        -q|--quiet)
            QUIET=1
            shift
            ;;
        --)
            shift
            break
            ;;
        *)
            echoerr "Unknown argument: $1"
            usage
            ;;
    esac
done

if [[ -z "$HOST" || -z "$PORT" ]]; then
    echoerr "Error: host and port required"
    usage
fi

wait_for

# Execute command if provided
if [[ $# -gt 0 ]]; then
    exec "$@"
fi