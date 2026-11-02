# Interaction model comparison — actual captured API data

Collection start UTC: 2026-11-02T07:20:21.213Z. Individual fetch times/HTTP headers: evidence.json. Scores 0–100, percentile normalization within role and cohort. No sample-count estimates. A/B/C share v2 S eligibility; D changes gates only.

A: 100 × (.65W + .25P + .10B)

B: 100 × W × (.70 + .20P + .10B)

C: 100 × W × (.70 + .20√P + .10B)

D: A score; S requires QW≥75, QP≥50 (other v2 gates unchanged)

## Summary

```json
{
  "all": [
    {
      "id": "A",
      "distribution": {
        "S": 57,
        "A": 47,
        "B": 64,
        "C": 84,
        "D": 72,
        "unclassified": 0
      },
      "rankChanges": 0,
      "tierChanges": 0,
      "maxRankShift": 0,
      "caps": 3,
      "lowWinProvisionalS": 0,
      "lowWinFinalS": 0,
      "lowUseProvisionalS": 3,
      "lowUseFinalS": 0,
      "highWinLowUseTop3": 2
    },
    {
      "id": "B",
      "distribution": {
        "S": 52,
        "A": 50,
        "B": 66,
        "C": 84,
        "D": 72,
        "unclassified": 0
      },
      "rankChanges": 197,
      "tierChanges": 74,
      "maxRankShift": 6,
      "caps": 8,
      "lowWinProvisionalS": 0,
      "lowWinFinalS": 0,
      "lowUseProvisionalS": 8,
      "lowUseFinalS": 0,
      "highWinLowUseTop3": 6
    },
    {
      "id": "C",
      "distribution": {
        "S": 51,
        "A": 51,
        "B": 66,
        "C": 84,
        "D": 72,
        "unclassified": 0
      },
      "rankChanges": 216,
      "tierChanges": 82,
      "maxRankShift": 6,
      "caps": 9,
      "lowWinProvisionalS": 0,
      "lowWinFinalS": 0,
      "lowUseProvisionalS": 9,
      "lowUseFinalS": 0,
      "highWinLowUseTop3": 8
    },
    {
      "id": "D",
      "distribution": {
        "S": 47,
        "A": 57,
        "B": 64,
        "C": 84,
        "D": 72,
        "unclassified": 0
      },
      "rankChanges": 0,
      "tierChanges": 10,
      "maxRankShift": 0,
      "caps": 13,
      "lowWinProvisionalS": 0,
      "lowWinFinalS": 0,
      "lowUseProvisionalS": 3,
      "lowUseFinalS": 0,
      "highWinLowUseTop3": 2
    }
  ],
  "asia": [
    {
      "id": "A",
      "distribution": {
        "S": 39,
        "A": 30,
        "B": 43,
        "C": 56,
        "D": 48,
        "unclassified": 0
      },
      "rankChanges": 0,
      "tierChanges": 0,
      "maxRankShift": 0,
      "caps": 1,
      "lowWinProvisionalS": 0,
      "lowWinFinalS": 0,
      "lowUseProvisionalS": 1,
      "lowUseFinalS": 0,
      "highWinLowUseTop3": 1
    },
    {
      "id": "B",
      "distribution": {
        "S": 35,
        "A": 33,
        "B": 44,
        "C": 56,
        "D": 48,
        "unclassified": 0
      },
      "rankChanges": 135,
      "tierChanges": 44,
      "maxRankShift": 6,
      "caps": 5,
      "lowWinProvisionalS": 0,
      "lowWinFinalS": 0,
      "lowUseProvisionalS": 5,
      "lowUseFinalS": 0,
      "highWinLowUseTop3": 4
    },
    {
      "id": "C",
      "distribution": {
        "S": 35,
        "A": 33,
        "B": 44,
        "C": 56,
        "D": 48,
        "unclassified": 0
      },
      "rankChanges": 144,
      "tierChanges": 49,
      "maxRankShift": 6,
      "caps": 5,
      "lowWinProvisionalS": 0,
      "lowWinFinalS": 0,
      "lowUseProvisionalS": 5,
      "lowUseFinalS": 0,
      "highWinLowUseTop3": 4
    },
    {
      "id": "D",
      "distribution": {
        "S": 34,
        "A": 35,
        "B": 43,
        "C": 56,
        "D": 48,
        "unclassified": 0
      },
      "rankChanges": 0,
      "tierChanges": 5,
      "maxRankShift": 0,
      "caps": 6,
      "lowWinProvisionalS": 0,
      "lowWinFinalS": 0,
      "lowUseProvisionalS": 1,
      "lowUseFinalS": 0,
      "highWinLowUseTop3": 1
    }
  ],
  "sensitivity": [
    {
      "id": "A",
      "experiments": 96,
      "targetTierChanges": 0,
      "maxRankShift": 1
    },
    {
      "id": "B",
      "experiments": 96,
      "targetTierChanges": 1,
      "maxRankShift": 1
    },
    {
      "id": "C",
      "experiments": 96,
      "targetTierChanges": 2,
      "maxRankShift": 2
    },
    {
      "id": "D",
      "experiments": 96,
      "targetTierChanges": 1,
      "maxRankShift": 1
    }
  ],
  "crossCohorts": [
    {
      "comparison": "asia/diamond vs asia/all",
      "roles": [
        {
          "role": "tank",
          "models": [
            {
              "id": "A",
              "heroes": 15,
              "sameTier": 8,
              "spearman": 0.8893,
              "maxRankShift": 4
            },
            {
              "id": "B",
              "heroes": 15,
              "sameTier": 7,
              "spearman": 0.9107,
              "maxRankShift": 4
            },
            {
              "id": "C",
              "heroes": 15,
              "sameTier": 7,
              "spearman": 0.9071,
              "maxRankShift": 4
            },
            {
              "id": "D",
              "heroes": 15,
              "sameTier": 9,
              "spearman": 0.8893,
              "maxRankShift": 4
            }
          ]
        },
        {
          "role": "damage",
          "models": [
            {
              "id": "A",
              "heroes": 23,
              "sameTier": 11,
              "spearman": 0.849,
              "maxRankShift": 8
            },
            {
              "id": "B",
              "heroes": 23,
              "sameTier": 13,
              "spearman": 0.8933,
              "maxRankShift": 6
            },
            {
              "id": "C",
              "heroes": 23,
              "sameTier": 13,
              "spearman": 0.8972,
              "maxRankShift": 6
            },
            {
              "id": "D",
              "heroes": 23,
              "sameTier": 10,
              "spearman": 0.849,
              "maxRankShift": 8
            }
          ]
        },
        {
          "role": "support",
          "models": [
            {
              "id": "A",
              "heroes": 16,
              "sameTier": 12,
              "spearman": 0.9301,
              "maxRankShift": 5
            },
            {
              "id": "B",
              "heroes": 16,
              "sameTier": 12,
              "spearman": 0.9412,
              "maxRankShift": 4
            },
            {
              "id": "C",
              "heroes": 16,
              "sameTier": 12,
              "spearman": 0.9382,
              "maxRankShift": 4
            },
            {
              "id": "D",
              "heroes": 16,
              "sameTier": 12,
              "spearman": 0.9301,
              "maxRankShift": 5
            }
          ]
        }
      ]
    },
    {
      "comparison": "asia/diamond vs asia/master",
      "roles": [
        {
          "role": "tank",
          "models": [
            {
              "id": "A",
              "heroes": 15,
              "sameTier": 9,
              "spearman": 0.9429,
              "maxRankShift": 2
            },
            {
              "id": "B",
              "heroes": 15,
              "sameTier": 11,
              "spearman": 0.9536,
              "maxRankShift": 2
            },
            {
              "id": "C",
              "heroes": 15,
              "sameTier": 11,
              "spearman": 0.9536,
              "maxRankShift": 2
            },
            {
              "id": "D",
              "heroes": 15,
              "sameTier": 10,
              "spearman": 0.9429,
              "maxRankShift": 2
            }
          ]
        },
        {
          "role": "damage",
          "models": [
            {
              "id": "A",
              "heroes": 23,
              "sameTier": 11,
              "spearman": 0.837,
              "maxRankShift": 7
            },
            {
              "id": "B",
              "heroes": 23,
              "sameTier": 11,
              "spearman": 0.8251,
              "maxRankShift": 10
            },
            {
              "id": "C",
              "heroes": 23,
              "sameTier": 11,
              "spearman": 0.8518,
              "maxRankShift": 9
            },
            {
              "id": "D",
              "heroes": 23,
              "sameTier": 12,
              "spearman": 0.837,
              "maxRankShift": 7
            }
          ]
        },
        {
          "role": "support",
          "models": [
            {
              "id": "A",
              "heroes": 16,
              "sameTier": 12,
              "spearman": 0.9787,
              "maxRankShift": 2
            },
            {
              "id": "B",
              "heroes": 16,
              "sameTier": 11,
              "spearman": 0.9324,
              "maxRankShift": 4
            },
            {
              "id": "C",
              "heroes": 16,
              "sameTier": 10,
              "spearman": 0.9353,
              "maxRankShift": 4
            },
            {
              "id": "D",
              "heroes": 16,
              "sameTier": 12,
              "spearman": 0.9787,
              "maxRankShift": 2
            }
          ]
        }
      ]
    },
    {
      "comparison": "asia/diamond vs asia/grandmaster",
      "roles": [
        {
          "role": "tank",
          "models": [
            {
              "id": "A",
              "heroes": 15,
              "sameTier": 11,
              "spearman": 0.8821,
              "maxRankShift": 4
            },
            {
              "id": "B",
              "heroes": 15,
              "sameTier": 9,
              "spearman": 0.8036,
              "maxRankShift": 6
            },
            {
              "id": "C",
              "heroes": 15,
              "sameTier": 9,
              "spearman": 0.8036,
              "maxRankShift": 6
            },
            {
              "id": "D",
              "heroes": 15,
              "sameTier": 10,
              "spearman": 0.8821,
              "maxRankShift": 4
            }
          ]
        },
        {
          "role": "damage",
          "models": [
            {
              "id": "A",
              "heroes": 23,
              "sameTier": 3,
              "spearman": 0.4002,
              "maxRankShift": 13
            },
            {
              "id": "B",
              "heroes": 23,
              "sameTier": 5,
              "spearman": 0.3587,
              "maxRankShift": 14
            },
            {
              "id": "C",
              "heroes": 23,
              "sameTier": 4,
              "spearman": 0.3271,
              "maxRankShift": 14
            },
            {
              "id": "D",
              "heroes": 23,
              "sameTier": 4,
              "spearman": 0.4002,
              "maxRankShift": 13
            }
          ]
        },
        {
          "role": "support",
          "models": [
            {
              "id": "A",
              "heroes": 16,
              "sameTier": 9,
              "spearman": 0.9176,
              "maxRankShift": 4
            },
            {
              "id": "B",
              "heroes": 16,
              "sameTier": 8,
              "spearman": 0.9029,
              "maxRankShift": 4
            },
            {
              "id": "C",
              "heroes": 16,
              "sameTier": 8,
              "spearman": 0.8941,
              "maxRankShift": 4
            },
            {
              "id": "D",
              "heroes": 16,
              "sameTier": 9,
              "spearman": 0.9176,
              "maxRankShift": 4
            }
          ]
        }
      ]
    },
    {
      "comparison": "asia/diamond vs americas/diamond",
      "roles": [
        {
          "role": "tank",
          "models": [
            {
              "id": "A",
              "heroes": 15,
              "sameTier": 11,
              "spearman": 0.8571,
              "maxRankShift": 6
            },
            {
              "id": "B",
              "heroes": 15,
              "sameTier": 9,
              "spearman": 0.8929,
              "maxRankShift": 4
            },
            {
              "id": "C",
              "heroes": 15,
              "sameTier": 9,
              "spearman": 0.8893,
              "maxRankShift": 4
            },
            {
              "id": "D",
              "heroes": 15,
              "sameTier": 10,
              "spearman": 0.8571,
              "maxRankShift": 6
            }
          ]
        },
        {
          "role": "damage",
          "models": [
            {
              "id": "A",
              "heroes": 23,
              "sameTier": 9,
              "spearman": 0.6736,
              "maxRankShift": 16
            },
            {
              "id": "B",
              "heroes": 23,
              "sameTier": 11,
              "spearman": 0.7569,
              "maxRankShift": 13
            },
            {
              "id": "C",
              "heroes": 23,
              "sameTier": 11,
              "spearman": 0.75,
              "maxRankShift": 13
            },
            {
              "id": "D",
              "heroes": 23,
              "sameTier": 11,
              "spearman": 0.6736,
              "maxRankShift": 16
            }
          ]
        },
        {
          "role": "support",
          "models": [
            {
              "id": "A",
              "heroes": 16,
              "sameTier": 9,
              "spearman": 0.7324,
              "maxRankShift": 11
            },
            {
              "id": "B",
              "heroes": 16,
              "sameTier": 8,
              "spearman": 0.6706,
              "maxRankShift": 10
            },
            {
              "id": "C",
              "heroes": 16,
              "sameTier": 10,
              "spearman": 0.6882,
              "maxRankShift": 10
            },
            {
              "id": "D",
              "heroes": 16,
              "sameTier": 9,
              "spearman": 0.7324,
              "maxRankShift": 11
            }
          ]
        }
      ]
    },
    {
      "comparison": "asia/diamond vs europe/diamond",
      "roles": [
        {
          "role": "tank",
          "models": [
            {
              "id": "A",
              "heroes": 15,
              "sameTier": 11,
              "spearman": 0.8357,
              "maxRankShift": 7
            },
            {
              "id": "B",
              "heroes": 15,
              "sameTier": 9,
              "spearman": 0.875,
              "maxRankShift": 5
            },
            {
              "id": "C",
              "heroes": 15,
              "sameTier": 10,
              "spearman": 0.8821,
              "maxRankShift": 5
            },
            {
              "id": "D",
              "heroes": 15,
              "sameTier": 11,
              "spearman": 0.8357,
              "maxRankShift": 7
            }
          ]
        },
        {
          "role": "damage",
          "models": [
            {
              "id": "A",
              "heroes": 23,
              "sameTier": 11,
              "spearman": 0.6621,
              "maxRankShift": 17
            },
            {
              "id": "B",
              "heroes": 23,
              "sameTier": 11,
              "spearman": 0.7749,
              "maxRankShift": 13
            },
            {
              "id": "C",
              "heroes": 23,
              "sameTier": 11,
              "spearman": 0.7628,
              "maxRankShift": 13
            },
            {
              "id": "D",
              "heroes": 23,
              "sameTier": 11,
              "spearman": 0.6621,
              "maxRankShift": 17
            }
          ]
        },
        {
          "role": "support",
          "models": [
            {
              "id": "A",
              "heroes": 16,
              "sameTier": 8,
              "spearman": 0.741,
              "maxRankShift": 8
            },
            {
              "id": "B",
              "heroes": 16,
              "sameTier": 9,
              "spearman": 0.7676,
              "maxRankShift": 8
            },
            {
              "id": "C",
              "heroes": 16,
              "sameTier": 11,
              "spearman": 0.7529,
              "maxRankShift": 9
            },
            {
              "id": "D",
              "heroes": 16,
              "sameTier": 8,
              "spearman": 0.741,
              "maxRankShift": 8
            }
          ]
        }
      ]
    }
  ],
  "diagnostics": [
    {
      "id": "noBan",
      "ranks": 140,
      "tiers": 33,
      "caps": 4,
      "highWinLowUseTop3": 2,
      "lowWinFinalS": 0
    },
    {
      "id": "pickPenalty",
      "ranks": 134,
      "tiers": 51,
      "caps": 4,
      "highWinLowUseTop3": 2,
      "lowWinFinalS": 0
    }
  ]
}
```

## asia/all

HOW fetched: 2026-11-02T07:20:22.913Z, API Age: 2088; not source aggregation time.

|Hero|Role|W/P/B (%)|Model|Score|Role rank|Provisional → final|S eligibility|Failed rules|
|---|---|---|---|---:|---:|---|---|---|
|겐지|damage|53.4/13.6/1.9|A|80.91|2|S → S|pass|—|
|겐지|damage|53.4/13.6/1.9|B|76.24|3|S → S|pass|—|
|겐지|damage|53.4/13.6/1.9|C|76.97|3|S → S|pass|—|
|겐지|damage|53.4/13.6/1.9|D|80.91|2|S → S|pass|—|
|벤데타|damage|55.3/6.9/35.7|A|83.64|1|S → A|fail|pickPercentile 36.36 < 40|
|벤데타|damage|55.3/6.9/35.7|B|86.82|1|S → A|fail|pickPercentile 36.36 < 40|
|벤데타|damage|55.3/6.9/35.7|C|91.61|1|S → A|fail|pickPercentile 36.36 < 40|
|벤데타|damage|55.3/6.9/35.7|D|83.64|1|S → A|fail|pickPercentile 36.36 < 50|
|벤처|damage|53.6/2.5/0.3|A|60.91|10|B → B|fail|pickPercentile 0.00 < 40|
|벤처|damage|53.6/2.5/0.3|B|65.29|6|A → A|fail|pickPercentile 0.00 < 40|
|벤처|damage|53.6/2.5/0.3|C|65.29|7|A → A|fail|pickPercentile 0.00 < 40|
|벤처|damage|53.6/2.5/0.3|D|60.91|10|B → B|fail|pickPercentile 0.00 < 50|
|토르비욘|damage|54.1/7.8/1.4|A|77.27|3|S → S|pass|—|
|토르비욘|damage|54.1/7.8/1.4|B|79.18|2|S → S|pass|—|
|토르비욘|damage|54.1/7.8/1.4|C|83.38|2|S → S|pass|—|
|토르비욘|damage|54.1/7.8/1.4|D|77.27|3|S → A|fail|pickPercentile 45.45 < 50|
|트레이서|damage|49.7/13.1/5.1|A|65.23|9|B → B|fail|winRate 49.70 < 50; winPercentile 54.55 < 60|
|트레이서|damage|49.7/13.1/5.1|B|52.07|11|B → B|fail|winRate 49.70 < 50; winPercentile 54.55 < 60|
|트레이서|damage|49.7/13.1/5.1|C|52.78|11|B → B|fail|winRate 49.70 < 50; winPercentile 54.55 < 60|
|트레이서|damage|49.7/13.1/5.1|D|65.23|9|B → B|fail|winRate 49.70 < 50; winPercentile 54.55 < 75|
|도미나|tank|53.9/6.7/3.3|A|81.96|2|S → S|pass|—|
|도미나|tank|53.9/6.7/3.3|B|84.29|2|S → S|pass|—|
|도미나|tank|53.9/6.7/3.3|C|88.21|2|S → S|pass|—|
|도미나|tank|53.9/6.7/3.3|D|81.96|2|S → S|pass|—|
|윈스턴|tank|53/10.9/11|A|90.71|1|S → S|pass|—|
|윈스턴|tank|53/10.9/11|B|88.88|1|S → S|pass|—|
|윈스턴|tank|53/10.9/11|C|89.53|1|S → S|pass|—|
|윈스턴|tank|53/10.9/11|D|90.71|1|S → S|pass|—|
|둠피스트|tank|51.8/7.3/29|A|73.57|5|A → A|pass|—|
|둠피스트|tank|51.8/7.3/29|B|66.84|5|A → A|pass|—|
|둠피스트|tank|51.8/7.3/29|C|68.71|5|A → A|pass|—|
|둠피스트|tank|51.8/7.3/29|D|73.57|5|A → A|fail|winPercentile 71.43 < 75|

|Model|S/A/B/C/D/unclassified|Capped heroes|
|---|---|---|
|A|9/9/10/14/12/0|vendetta|
|B|8/9/11/14/12/0|symmetra, vendetta|
|C|8/9/11/14/12/0|symmetra, vendetta|
|D|7/11/10/14/12/0|anran, torbjorn, vendetta|

## asia/diamond

HOW fetched: 2026-11-02T07:20:23.218Z, API Age: 1775; not source aggregation time.

|Hero|Role|W/P/B (%)|Model|Score|Role rank|Provisional → final|S eligibility|Failed rules|
|---|---|---|---|---:|---:|---|---|---|
|겐지|damage|52.8/20.3/1.5|A|78.41|4|S → S|pass|—|
|겐지|damage|52.8/20.3/1.5|B|72.36|4|S → S|pass|—|
|겐지|damage|52.8/20.3/1.5|C|73.04|4|S → S|pass|—|
|겐지|damage|52.8/20.3/1.5|D|78.41|4|S → S|pass|—|
|벤데타|damage|53.8/6.4/19.2|A|84.89|3|S → S|pass|—|
|벤데타|damage|53.8/6.4/19.2|B|85.13|3|S → S|pass|—|
|벤데타|damage|53.8/6.4/19.2|C|88.45|3|S → S|pass|—|
|벤데타|damage|53.8/6.4/19.2|D|84.89|3|S → S|pass|—|
|벤처|damage|53.5/2.9/0.3|A|57.95|9|B → B|fail|pickPercentile 0.00 < 40|
|벤처|damage|53.5/2.9/0.3|B|62.02|6|A → A|fail|pickPercentile 0.00 < 40|
|벤처|damage|53.5/2.9/0.3|C|62.02|7|A → A|fail|pickPercentile 0.00 < 40|
|벤처|damage|53.5/2.9/0.3|D|57.95|9|B → B|fail|pickPercentile 0.00 < 50|
|토르비욘|damage|54.2/9.1/2.5|A|91.59|1|S → S|pass|—|
|토르비욘|damage|54.2/9.1/2.5|B|92.73|1|S → S|pass|—|
|토르비욘|damage|54.2/9.1/2.5|C|94.85|1|S → S|pass|—|
|토르비욘|damage|54.2/9.1/2.5|D|91.59|1|S → S|pass|—|
|트레이서|damage|49.9/24.7/5.8|A|70.45|5|A → A|fail|winRate 49.90 < 50; winPercentile 59.09 < 60|
|트레이서|damage|49.9/24.7/5.8|B|57.48|8|B → B|fail|winRate 49.90 < 50; winPercentile 59.09 < 60|
|트레이서|damage|49.9/24.7/5.8|C|57.74|9|B → B|fail|winRate 49.90 < 50; winPercentile 59.09 < 60|
|트레이서|damage|49.9/24.7/5.8|D|70.45|5|A → A|fail|winRate 49.90 < 50; winPercentile 59.09 < 75|
|도미나|tank|54.6/4.8/2|A|70.89|4|A → A|fail|pickPercentile 21.43 < 40|
|도미나|tank|54.6/4.8/2|B|74.39|2|S → A|fail|pickPercentile 21.43 < 40|
|도미나|tank|54.6/4.8/2|C|79.18|2|S → A|fail|pickPercentile 21.43 < 40|
|도미나|tank|54.6/4.8/2|D|70.89|4|A → A|fail|pickPercentile 21.43 < 50|
|윈스턴|tank|54.6/15.3/8.9|A|94.82|1|S → S|pass|—|
|윈스턴|tank|54.6/15.3/8.9|B|93.67|1|S → S|pass|—|
|윈스턴|tank|54.6/15.3/8.9|C|93.67|1|S → S|pass|—|
|윈스턴|tank|54.6/15.3/8.9|D|94.82|1|S → S|pass|—|
|둠피스트|tank|51/11.8/31.7|A|78.93|2|S → S|pass|—|
|둠피스트|tank|51/11.8/31.7|B|69.90|5|A → A|pass|—|
|둠피스트|tank|51/11.8/31.7|C|70.40|5|A → A|pass|—|
|둠피스트|tank|51/11.8/31.7|D|78.93|2|S → A|fail|winPercentile 71.43 < 75|

|Model|S/A/B/C/D/unclassified|Capped heroes|
|---|---|---|
|A|10/7/11/14/12/0|none|
|B|9/8/11/14/12/0|domina|
|C|9/8/11/14/12/0|domina|
|D|9/8/11/14/12/0|doomfist|

## asia/master

HOW fetched: 2026-11-02T07:20:23.526Z, API Age: 1776; not source aggregation time.

|Hero|Role|W/P/B (%)|Model|Score|Role rank|Provisional → final|S eligibility|Failed rules|
|---|---|---|---|---:|---:|---|---|---|
|겐지|damage|51.2/19.9/1.3|A|75.91|5|A → A|pass|—|
|겐지|damage|51.2/19.9/1.3|B|68.43|5|A → A|pass|—|
|겐지|damage|51.2/19.9/1.3|C|69.08|5|A → A|pass|—|
|겐지|damage|51.2/19.9/1.3|D|75.91|5|A → A|fail|winPercentile 72.73 < 75|
|벤데타|damage|53.2/6.9/10.6|A|81.02|2|S → S|pass|—|
|벤데타|damage|53.2/6.9/10.6|B|80.18|2|S → S|pass|—|
|벤데타|damage|53.2/6.9/10.6|C|83.33|2|S → S|pass|—|
|벤데타|damage|53.2/6.9/10.6|D|81.02|2|S → S|pass|—|
|벤처|damage|53.2/3.4/0.2|A|61.48|9|B → B|fail|pickPercentile 9.09 < 40|
|벤처|damage|53.2/3.4/0.2|B|65.07|7|A → A|fail|pickPercentile 9.09 < 40|
|벤처|damage|53.2/3.4/0.2|C|68.80|6|A → A|fail|pickPercentile 9.09 < 40|
|벤처|damage|53.2/3.4/0.2|D|61.48|9|B → B|fail|pickPercentile 9.09 < 50|
|토르비욘|damage|53.6/10.2/2.5|A|89.09|1|S → S|pass|—|
|토르비욘|damage|53.6/10.2/2.5|B|88.95|1|S → S|pass|—|
|토르비욘|damage|53.6/10.2/2.5|C|90.98|1|S → S|pass|—|
|토르비욘|damage|53.6/10.2/2.5|D|89.09|1|S → S|pass|—|
|트레이서|damage|50.7/27.3/7.5|A|76.36|4|S → S|pass|—|
|트레이서|damage|50.7/27.3/7.5|B|66.32|6|A → A|pass|—|
|트레이서|damage|50.7/27.3/7.5|C|66.63|8|B → B|pass|—|
|트레이서|damage|50.7/27.3/7.5|D|76.36|4|S → A|fail|winPercentile 68.18 < 75|
|도미나|tank|53.8/3.9/1.6|A|67.86|5|A → A|fail|pickPercentile 21.43 < 40|
|도미나|tank|53.8/3.9/1.6|B|70.97|3|S → A|fail|pickPercentile 21.43 < 40|
|도미나|tank|53.8/3.9/1.6|C|75.59|3|S → A|fail|pickPercentile 21.43 < 40|
|도미나|tank|53.8/3.9/1.6|D|67.86|5|A → A|fail|pickPercentile 21.43 < 50|
|윈스턴|tank|53.5/16.4/7.9|A|87.86|2|S → S|pass|—|
|윈스턴|tank|53.5/16.4/7.9|B|83.27|2|S → S|pass|—|
|윈스턴|tank|53.5/16.4/7.9|C|83.27|2|S → S|pass|—|
|윈스턴|tank|53.5/16.4/7.9|D|87.86|2|S → S|pass|—|
|둠피스트|tank|49.7/10.7/31.3|A|74.29|4|A → A|fail|winRate 49.70 < 50|
|둠피스트|tank|49.7/10.7/31.3|B|62.91|5|A → A|fail|winRate 49.70 < 50|
|둠피스트|tank|49.7/10.7/31.3|C|63.36|5|A → A|fail|winRate 49.70 < 50|
|둠피스트|tank|49.7/10.7/31.3|D|74.29|4|A → A|fail|winRate 49.70 < 50; winPercentile 64.29 < 75|

|Model|S/A/B/C/D/unclassified|Capped heroes|
|---|---|---|
|A|10/7/11/14/12/0|none|
|B|8/9/11/14/12/0|domina, symmetra|
|C|8/9/11/14/12/0|domina, symmetra|
|D|9/8/11/14/12/0|tracer|

## asia/grandmaster

HOW fetched: 2026-11-02T07:20:24.008Z, API Age: 1778; not source aggregation time.

|Hero|Role|W/P/B (%)|Model|Score|Role rank|Provisional → final|S eligibility|Failed rules|
|---|---|---|---|---:|---:|---|---|---|
|겐지|damage|49.8/19.1/1.1|A|66.59|8|B → B|fail|winRate 49.80 < 50; winPercentile 59.09 < 60|
|겐지|damage|49.8/19.1/1.1|B|55.33|9|B → B|fail|winRate 49.80 < 50; winPercentile 59.09 < 60|
|겐지|damage|49.8/19.1/1.1|C|55.85|10|B → B|fail|winRate 49.80 < 50; winPercentile 59.09 < 60|
|겐지|damage|49.8/19.1/1.1|D|66.59|8|B → B|fail|winRate 49.80 < 50; winPercentile 59.09 < 75|
|벤데타|damage|52.1/7/5.6|A|79.55|3|S → S|pass|—|
|벤데타|damage|52.1/7/5.6|B|75.87|4|S → S|pass|—|
|벤데타|damage|52.1/7/5.6|C|77.92|5|A → A|pass|—|
|벤데타|damage|52.1/7/5.6|D|79.55|3|S → S|pass|—|
|벤처|damage|47.3/3.4/0.3|A|28.52|18|C → C|fail|winRate 47.30 < 50; winPercentile 31.82 < 60; pickPercentile 20.45 < 40|
|벤처|damage|47.3/3.4/0.3|B|24.44|16|C → C|fail|winRate 47.30 < 50; winPercentile 31.82 < 60; pickPercentile 20.45 < 40|
|벤처|damage|47.3/3.4/0.3|C|26.02|16|C → C|fail|winRate 47.30 < 50; winPercentile 31.82 < 60; pickPercentile 20.45 < 40|
|벤처|damage|47.3/3.4/0.3|D|28.52|18|C → C|fail|winRate 47.30 < 50; winPercentile 31.82 < 75; pickPercentile 20.45 < 50|
|토르비욘|damage|51.1/10.1/2.9|A|72.84|6|A → A|pass|—|
|토르비욘|damage|51.1/10.1/2.9|B|65.65|6|A → A|pass|—|
|토르비욘|damage|51.1/10.1/2.9|C|67.15|6|A → A|pass|—|
|토르비욘|damage|51.1/10.1/2.9|D|72.84|6|A → A|fail|winPercentile 70.45 < 75|
|트레이서|damage|52.4/32.7/9.1|A|88.64|2|S → S|pass|—|
|트레이서|damage|52.4/32.7/9.1|B|84.40|2|S → S|pass|—|
|트레이서|damage|52.4/32.7/9.1|C|84.79|2|S → S|pass|—|
|트레이서|damage|52.4/32.7/9.1|D|88.64|2|S → S|pass|—|
|도미나|tank|53/4.3/1.2|A|62.50|5|A → A|fail|pickPercentile 21.43 < 40|
|도미나|tank|53/4.3/1.2|B|64.90|4|A → A|fail|pickPercentile 21.43 < 40|
|도미나|tank|53/4.3/1.2|C|69.16|4|A → A|fail|pickPercentile 21.43 < 40|
|도미나|tank|53/4.3/1.2|D|62.50|5|A → A|fail|pickPercentile 21.43 < 50|
|윈스턴|tank|52.5/17.3/10.2|A|83.21|3|S → S|pass|—|
|윈스턴|tank|52.5/17.3/10.2|B|76.33|3|S → S|pass|—|
|윈스턴|tank|52.5/17.3/10.2|C|76.33|3|S → S|pass|—|
|윈스턴|tank|52.5/17.3/10.2|D|83.21|3|S → S|pass|—|
|둠피스트|tank|54.1/10.2/30|A|92.86|2|S → S|pass|—|
|둠피스트|tank|54.1/10.2/30|B|90.87|2|S → S|pass|—|
|둠피스트|tank|54.1/10.2/30|C|91.52|2|S → S|pass|—|
|둠피스트|tank|54.1/10.2/30|D|92.86|2|S → S|pass|—|

|Model|S/A/B/C/D/unclassified|Capped heroes|
|---|---|---|
|A|10/7/11/14/12/0|none|
|B|10/7/11/14/12/0|none|
|C|10/7/11/14/12/0|none|
|D|9/8/11/14/12/0|symmetra|

## americas/diamond

HOW fetched: 2026-11-02T07:20:24.737Z, API Age: not supplied; not source aggregation time.

|Hero|Role|W/P/B (%)|Model|Score|Role rank|Provisional → final|S eligibility|Failed rules|
|---|---|---|---|---:|---:|---|---|---|
|겐지|damage|54.5/23.8/7.7|A|94.32|1|S → S|pass|—|
|겐지|damage|54.5/23.8/7.7|B|92.85|1|S → S|pass|—|
|겐지|damage|54.5/23.8/7.7|C|92.85|2|S → S|pass|—|
|겐지|damage|54.5/23.8/7.7|D|94.32|1|S → S|pass|—|
|벤데타|damage|54.7/6.6/9.6|A|87.95|2|S → S|pass|—|
|벤데타|damage|54.7/6.6/9.6|B|90.00|2|S → S|pass|—|
|벤데타|damage|54.7/6.6/9.6|C|93.56|1|S → S|pass|—|
|벤데타|damage|54.7/6.6/9.6|D|87.95|2|S → S|pass|—|
|벤처|damage|53.5/2.8/0.4|A|58.41|8|B → B|fail|pickPercentile 4.55 < 40|
|벤처|damage|53.5/2.8/0.4|B|62.22|6|A → A|fail|pickPercentile 4.55 < 40|
|벤처|damage|53.5/2.8/0.4|C|65.12|7|A → A|fail|pickPercentile 4.55 < 40|
|벤처|damage|53.5/2.8/0.4|D|58.41|8|B → B|fail|pickPercentile 4.55 < 50|
|토르비욘|damage|52.1/5.1/0.7|A|61.02|6|A → A|fail|pickPercentile 27.27 < 40|
|토르비욘|damage|52.1/5.1/0.7|B|62.01|7|A → A|fail|pickPercentile 27.27 < 40|
|토르비욘|damage|52.1/5.1/0.7|C|65.98|6|A → A|fail|pickPercentile 27.27 < 40|
|토르비욘|damage|52.1/5.1/0.7|D|61.02|6|A → A|fail|pickPercentile 27.27 < 50|
|트레이서|damage|51.8/18.5/14.9|A|79.09|3|S → S|pass|—|
|트레이서|damage|51.8/18.5/14.9|B|70.74|3|S → S|pass|—|
|트레이서|damage|51.8/18.5/14.9|C|71.39|4|S → S|pass|—|
|트레이서|damage|51.8/18.5/14.9|D|79.09|3|S → A|fail|winPercentile 72.73 < 75|
|도미나|tank|53.7/3.8/1.6|A|68.21|4|A → A|fail|pickPercentile 7.14 < 40|
|도미나|tank|53.7/3.8/1.6|B|72.86|4|A → A|fail|pickPercentile 7.14 < 40|
|도미나|tank|53.7/3.8/1.6|C|76.77|4|A → A|fail|pickPercentile 7.14 < 40|
|도미나|tank|53.7/3.8/1.6|D|68.21|4|A → A|fail|pickPercentile 7.14 < 50|
|윈스턴|tank|53.4/12.9/8.8|A|91.07|1|S → S|pass|—|
|윈스턴|tank|53.4/12.9/8.8|B|88.88|1|S → S|pass|—|
|윈스턴|tank|53.4/12.9/8.8|C|88.88|1|S → S|pass|—|
|윈스턴|tank|53.4/12.9/8.8|D|91.07|1|S → S|pass|—|
|둠피스트|tank|52.2/12.5/28.8|A|83.57|2|S → S|pass|—|
|둠피스트|tank|52.2/12.5/28.8|B|76.89|2|S → S|pass|—|
|둠피스트|tank|52.2/12.5/28.8|C|77.44|3|S → S|pass|—|
|둠피스트|tank|52.2/12.5/28.8|D|83.57|2|S → S|pass|—|

|Model|S/A/B/C/D/unclassified|Capped heroes|
|---|---|---|
|A|9/8/11/14/12/0|dmon|
|B|8/9/11/14/12/0|dmon, pharah|
|C|8/9/11/14/12/0|dmon, pharah|
|D|7/10/11/14/12/0|dmon, junkrat, tracer|

## europe/diamond

HOW fetched: 2026-11-02T07:20:25.189Z, API Age: not supplied; not source aggregation time.

|Hero|Role|W/P/B (%)|Model|Score|Role rank|Provisional → final|S eligibility|Failed rules|
|---|---|---|---|---:|---:|---|---|---|
|겐지|damage|54.3/23.6/8.1|A|91.82|1|S → S|pass|—|
|겐지|damage|54.3/23.6/8.1|B|88.84|1|S → S|pass|—|
|겐지|damage|54.3/23.6/8.1|C|88.84|2|S → S|pass|—|
|겐지|damage|54.3/23.6/8.1|D|91.82|1|S → S|pass|—|
|벤데타|damage|54.6/6.3/7.1|A|82.50|2|S → S|pass|—|
|벤데타|damage|54.6/6.3/7.1|B|85.45|2|S → S|pass|—|
|벤데타|damage|54.6/6.3/7.1|C|90.06|1|S → S|pass|—|
|벤데타|damage|54.6/6.3/7.1|D|82.50|2|S → A|fail|pickPercentile 40.91 < 50|
|벤처|damage|53.9/2.6/0.4|A|58.41|8|B → B|fail|pickPercentile 4.55 < 40|
|벤처|damage|53.9/2.6/0.4|B|62.22|7|A → A|fail|pickPercentile 4.55 < 40|
|벤처|damage|53.9/2.6/0.4|C|65.12|7|A → A|fail|pickPercentile 4.55 < 40|
|벤처|damage|53.9/2.6/0.4|D|58.41|8|B → B|fail|pickPercentile 4.55 < 50|
|토르비욘|damage|53.2/5.3/0.6|A|61.59|7|A → A|fail|pickPercentile 22.73 < 40|
|토르비욘|damage|53.2/5.3/0.6|B|63.22|6|A → A|fail|pickPercentile 22.73 < 40|
|토르비욘|damage|53.2/5.3/0.6|C|67.31|6|A → A|fail|pickPercentile 22.73 < 40|
|토르비욘|damage|53.2/5.3/0.6|D|61.59|7|A → A|fail|pickPercentile 22.73 < 50|
|트레이서|damage|52.1/15.7/16|A|79.09|3|S → S|pass|—|
|트레이서|damage|52.1/15.7/16|B|70.74|4|S → S|pass|—|
|트레이서|damage|52.1/15.7/16|C|71.39|4|S → S|pass|—|
|트레이서|damage|52.1/15.7/16|D|79.09|3|S → A|fail|winPercentile 72.73 < 75|
|도미나|tank|53.6/3.5/1.3|A|65.36|5|A → A|fail|pickPercentile 14.29 < 40|
|도미나|tank|53.6/3.5/1.3|B|68.98|4|A → A|fail|pickPercentile 14.29 < 40|
|도미나|tank|53.6/3.5/1.3|C|73.35|3|S → A|fail|pickPercentile 14.29 < 40|
|도미나|tank|53.6/3.5/1.3|D|65.36|5|A → A|fail|pickPercentile 14.29 < 50|
|윈스턴|tank|54.2/12.9/11.9|A|95.71|1|S → S|pass|—|
|윈스턴|tank|54.2/12.9/11.9|B|95.71|1|S → S|pass|—|
|윈스턴|tank|54.2/12.9/11.9|C|95.71|1|S → S|pass|—|
|윈스턴|tank|54.2/12.9/11.9|D|95.71|1|S → S|pass|—|
|둠피스트|tank|52.2/12.2/29.5|A|78.93|2|S → S|pass|—|
|둠피스트|tank|52.2/12.2/29.5|B|69.90|3|S → S|pass|—|
|둠피스트|tank|52.2/12.2/29.5|C|70.40|5|A → A|pass|—|
|둠피스트|tank|52.2/12.2/29.5|D|78.93|2|S → A|fail|winPercentile 71.43 < 75|

|Model|S/A/B/C/D/unclassified|Capped heroes|
|---|---|---|
|A|9/9/10/14/12/0|pharah|
|B|9/8/11/14/12/0|pharah|
|C|8/9/11/14/12/0|domina, pharah|
|D|6/12/10/14/12/0|doomfist, pharah, tracer, vendetta|
