# ShopSphere Gateway — Demo Scripts

## Run attack demo (shows security blocking in real time)
```bash
cd demo
python3 attack_demo.py
```

## Run performance benchmark (generates paper metrics)
```bash
cd demo
python3 benchmark.py
```

## What to show at conference

1. Open http://localhost:5173 (ShopSphere shop) in one window
2. Open http://localhost:3001 (Monitor Dashboard) in another window
3. Run `python3 attack_demo.py` in terminal
4. Watch the dashboard light up red in real time as attacks are blocked
5. Run `python3 benchmark.py` for latency overhead numbers for the paper
