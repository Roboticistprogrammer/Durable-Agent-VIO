# Research profile (template)

Fill this in once, then condense it to about eight lines in the **Reader profile** block of `agents/news-desk/SYSTEM_PROMPT.md`. The full version stays here as your reference.

Do not write `{{` anywhere in the prompt: the prompt loader treats it as a variable and fails.

The profile steers the desk agent: what it asks about, how it words cards, what it relates an item to. The jev judges do not read it. They use your topics and the cards you label.

## 1. Platform

- Vehicle (type, size, payload):
- Cameras (mono / stereo / event, shutter, resolution, rate):
- IMU (model, rate):
- Other sensors (LiDAR, barometer, GNSS, optical flow, UWB):
- Onboard computer:
- Flight stack and middleware:

## 2. Pipeline

- Current VIO approach (filter / optimization / learned / hybrid):
- Frontend (features, direct, event-based):
- Calibration and time offset handling:
- Known failure modes (fast motion, low light, texture-poor, dynamic scenes, vibration):

## 3. Baselines and evaluation

- Baselines you compare against (for example OpenVINS, VINS-Fusion, ORB-SLAM3):
- Datasets (for example EuRoC, TUM-VI, UZH-FPV, your own):
- Metrics and tools (ATE, RPE, which evaluation toolkit):

## 4. Open problems that would make an item Signal

1.
2.
3.

## 5. Watch list

- Labs and groups:
- Authors:
- Repositories:
- Venues and deadlines (conference, journal, challenge, with dates):

## 6. Not interested

-
-

## 7. What "act on it now" means for you

Examples: a paper with code that beats your baseline on a dataset you use; a breaking change in a tool in your build; a new dataset with your sensor modality; a deadline within 30 days.

-

## Condensed block for the desk prompt

```
- Focus:
- Platform:
- Baselines in use:
- Datasets in use:
- Open problems:
- Not interested:
```

## Turning the profile into config

| Profile section | Goes to |
|---|---|
| 1, 2 | `keywords.json` topics (short phrases) and the Reader profile block |
| 3 | `facts` hint words (dataset names, metrics) and the Reader profile block |
| 4 | `signal` hint words and the Reader profile block |
| 5 | extra `sources.json` entries (arXiv `au:` queries, repo feeds, forums) |
| 6 | the Reader profile block, and Show less on the matching topics |
| 7 | the Reader profile block and `jev/hfs` signal instructions |
