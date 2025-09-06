#!/usr/bin/env python3
"""
Monitor and kill stuck compression processes
Run this script to see what Python processes are running and kill stuck ones
"""

import psutil
import time
import os
import signal
from datetime import datetime

def find_compression_processes():
    """Find Python processes that might be stuck compression processes"""
    stuck_processes = []
    
    for proc in psutil.process_iter(['pid', 'name', 'cpu_percent', 'memory_percent', 'create_time', 'cmdline']):
        try:
            # Look for Python processes
            if proc.info['name'] == 'python3' or proc.info['name'] == 'python':
                cmdline = proc.info['cmdline']
                if cmdline and any('book_compressor_mdl' in arg or 'run_' in arg for arg in cmdline):
                    # Check if it's been running too long or using too much CPU
                    cpu_percent = proc.cpu_percent()
                    memory_percent = proc.memory_percent()
                    uptime = time.time() - proc.info['create_time']
                    
                    # Flag as potentially stuck if:
                    # - High CPU usage (>80%) for more than 5 minutes
                    # - No memory change for more than 2 minutes
                    # - Been running for more than 10 minutes
                    
                    is_stuck = False
                    reason = []
                    
                    if uptime > 600:  # 10 minutes
                        reason.append(f"Running for {uptime/60:.1f} minutes")
                        is_stuck = True
                    
                    if cpu_percent > 80:
                        reason.append(f"High CPU: {cpu_percent:.1f}%")
                        is_stuck = True
                    
                    if uptime > 300:  # 5 minutes
                        reason.append(f"Long running: {uptime/60:.1f} minutes")
                        is_stuck = True
                    
                    if is_stuck:
                        stuck_processes.append({
                            'pid': proc.info['pid'],
                            'cmdline': ' '.join(cmdline),
                            'cpu_percent': cpu_percent,
                            'memory_percent': memory_percent,
                            'uptime': uptime,
                            'reason': reason
                        })
                        
        except (psutil.NoSuchProcess, psutil.AccessDenied, psutil.ZombieProcess):
            continue
    
    return stuck_processes

def kill_process(pid, reason="Manual kill"):
    """Kill a process by PID"""
    try:
        proc = psutil.Process(pid)
        print(f"🔄 Killing process {pid} ({reason})...")
        proc.terminate()
        
        # Wait a bit for graceful termination
        try:
            proc.wait(timeout=5)
            print(f"✅ Process {pid} terminated gracefully")
        except psutil.TimeoutExpired:
            print(f"⚠️  Process {pid} didn't terminate gracefully, force killing...")
            proc.kill()
            print(f"✅ Process {pid} force killed")
            
    except psutil.NoSuchProcess:
        print(f"ℹ️  Process {pid} already terminated")
    except psutil.AccessDenied:
        print(f"❌ Access denied to process {pid}")
    except Exception as e:
        print(f"❌ Error killing process {pid}: {e}")

def main():
    print("🔍 Monitoring compression processes...")
    print("=" * 60)
    
    while True:
        stuck_processes = find_compression_processes()
        
        if stuck_processes:
            print(f"\n🚨 Found {len(stuck_processes)} potentially stuck processes:")
            print("-" * 60)
            
            for i, proc in enumerate(stuck_processes):
                print(f"{i+1}. PID {proc['pid']}")
                print(f"   Command: {proc['cmdline'][:80]}...")
                print(f"   CPU: {proc['cpu_percent']:.1f}% | Memory: {proc['memory_percent']:.1f}%")
                print(f"   Uptime: {proc['uptime']/60:.1f} minutes")
                print(f"   Reasons: {', '.join(proc['reason'])}")
                print()
            
            print("Options:")
            print("  k <number> - Kill process by number")
            print("  k all     - Kill all stuck processes")
            print("  q          - Quit monitoring")
            print("  r          - Refresh")
            
            try:
                choice = input("Enter choice: ").strip().lower()
                
                if choice == 'q':
                    break
                elif choice == 'r':
                    continue
                elif choice == 'k all':
                    for proc in stuck_processes:
                        kill_process(proc['pid'], "Bulk kill of stuck processes")
                elif choice.startswith('k '):
                    try:
                        num = int(choice[2:]) - 1
                        if 0 <= num < len(stuck_processes):
                            proc = stuck_processes[num]
                            kill_process(proc['pid'], f"Manual kill of {proc['cmdline'][:30]}...")
                        else:
                            print("❌ Invalid process number")
                    except ValueError:
                        print("❌ Invalid input")
                else:
                    print("❌ Invalid choice")
                    
            except KeyboardInterrupt:
                print("\n👋 Monitoring stopped")
                break
                
        else:
            print(f"✅ No stuck processes found at {datetime.now().strftime('%H:%M:%S')}")
            print("Press Ctrl+C to stop monitoring...")
            
        time.sleep(10)  # Check every 10 seconds

if __name__ == "__main__":
    try:
        main()
    except KeyboardInterrupt:
        print("\n👋 Monitoring stopped")
