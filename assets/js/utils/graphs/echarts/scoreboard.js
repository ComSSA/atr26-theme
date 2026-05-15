import { mergeObjects } from "../../objects";

// 24 hand-picked colours. Consecutive entries jump ~180° across the hue
// wheel so adjacent lines are never from the same colour family.
// Lightness alternates dark/light within each jump to add extra separation.
const PALETTE = [
  "hsl(4,   58%, 26%)",  // deep crimson
  "hsl(184, 52%, 52%)",  // aqua
  "hsl(38,  60%, 28%)",  // dark amber
  "hsl(218, 48%, 56%)",  // sky blue
  "hsl(118, 54%, 24%)",  // deep forest green
  "hsl(298, 48%, 52%)",  // medium magenta
  "hsl(68,  52%, 26%)",  // dark olive
  "hsl(248, 50%, 54%)",  // medium indigo
  "hsl(158, 56%, 26%)",  // dark jade
  "hsl(328, 52%, 56%)",  // dusty rose
  "hsl(22,  55%, 54%)",  // terracotta/peach
  "hsl(202, 58%, 28%)",  // dark steel blue
  "hsl(88,  50%, 50%)",  // sage/lime
  "hsl(268, 54%, 28%)",  // dark violet
  "hsl(142, 48%, 52%)",  // sea green
  "hsl(348, 58%, 26%)",  // dark wine
  "hsl(52,  56%, 52%)",  // warm gold
  "hsl(232, 52%, 28%)",  // dark navy
  "hsl(172, 52%, 50%)",  // aqua-teal
  "hsl(312, 54%, 26%)",  // dark plum
  "hsl(106, 50%, 26%)",  // deep moss
  "hsl(286, 48%, 54%)",  // soft purple
  "hsl(15,  58%, 32%)",  // medium rust
  "hsl(195, 54%, 24%)",  // dark teal
];

// For teams beyond 24: golden angle hue + 4 lightness tiers so no two
// overflow colours share both similar hue and similar brightness.
const OVERFLOW_TIERS = [
  { l: 24, s: 55 },
  { l: 54, s: 44 },
  { l: 66, s: 36 },
  { l: 38, s: 50 },
];

function paletteColor(i) {
  if (i < PALETTE.length) return PALETTE[i];
  const hue = ((i - PALETTE.length) * 137.508) % 360;
  const { l, s } = OVERFLOW_TIERS[i % OVERFLOW_TIERS.length];
  return `hsl(${Math.round(hue)}, ${s}%, ${l}%)`;
}
import { cumulativeSum } from "../../math";
import dayjs from "dayjs";

export function getOption(mode, places, optionMerge) {
  let option = {
    title: {
      left: "center",
      text: "Top 10 " + (mode === "teams" ? "Teams" : "Users"),
      textStyle: {
        color: "#7B2D21",
        fontFamily: "'Share Tech Mono', monospace",
      }
    },
    tooltip: {
      trigger: "axis",
      axisPointer: {
        type: "cross",
        label: {
          backgroundColor: "#2B251D",
          color: "#DEC697",
          borderColor: "#7B2D21",
          borderWidth: 1,
          padding: [5, 10],
          fontFamily: "'Share Tech Mono', monospace",
        },
        crossStyle: {
          color: "#7B2D21",
        },
        lineStyle: {
          color: "#7B2D21",
        },
      },
      backgroundColor: "#2B251D",
      borderColor: "#7B2D21",
      borderWidth: 1,
      textStyle: {
        color: "#DEC697",
        fontFamily: "'Share Tech Mono', monospace",
      },
    },
    legend: {
      type: "scroll",
      orient: "horizontal",
      align: "left",
      bottom: 35,
      data: [],
      textStyle: {
        color: "#2B251D",
        fontFamily: "'Share Tech Mono', monospace",
      },
    },
    toolbox: {
      iconStyle: {
        borderColor: "#7B2D21",
      },
      feature: {
        dataZoom: {
          yAxisIndex: "none",
        },
        saveAsImage: {},
        title: "Download",
        iconStyle: {
          borderColor: "#7B2D21",
        },
      },
    },
    grid: {
      containLabel: true,
      borderColor: "#7B2D21",
    },
    xAxis: [
      {
        type: "time",
        boundaryGap: false,
        axisLine: {
          lineStyle: {
            color: "#7B2D21",
          },
        },
        axisTick: {
          lineStyle: {
            color: "#7B2D21",
          },
        },
        axisLabel: {
          color: "#2B251D",
          fontFamily: "'Share Tech Mono', monospace",
        },
        splitLine: {
          lineStyle: {
            color: "#C39D81",
          },
        },
        data: [],
      },
    ],
    yAxis: [
      {
        type: "value",
        axisLine: {
          lineStyle: {
            color: "#7B2D21",
          },
        },
        axisLabel: {
          color: "#2B251D",
          fontFamily: "'Share Tech Mono', monospace",
        },
        splitLine: {
          lineStyle: {
            color: "#C39D81",
          },
        },
      },
    ],
    dataZoom: [
      {
        id: "dataZoomX",
        type: "slider",
        xAxisIndex: [0],
        filterMode: "filter",
        height: 15,
        bottom: 10,
        fillerColor: "rgba(123, 45, 33, 0.15)",
        moveHandleStyle: {
          color: "#5a2018",
        },
        handleStyle: {
          color: "#7B2D21",
        },
        textStyle: {
          color: "#2B251D",
        },
        backgroundColor: "#EBD8AD",
        emphasis: {
          moveHandleStyle: {
            color: "#7B2D21",
          },
        },
      },
    ],
    series: [],
  };

  const teams = Object.keys(places);
  for (let i = 0; i < teams.length; i++) {
    const team_score = [];
    const times = [];
    for (let j = 0; j < places[teams[i]]["solves"].length; j++) {
      team_score.push(places[teams[i]]["solves"][j].value);
      const date = dayjs(places[teams[i]]["solves"][j].date);
      times.push(date.toDate());
    }

    const total_scores = cumulativeSum(team_score);
    let scores = times.map(function (e, i) {
      return [e, total_scores[i]];
    });

    option.legend.data.push(places[teams[i]]["name"]);

    const data = {
      name: places[teams[i]]["name"],
      type: "line",
      label: {
        normal: {
          position: "top",
        },
      },
      itemStyle: {
        normal: {
          color: paletteColor(i),
        },
      },
      data: scores,
    };
    option.series.push(data);
  }

  if (optionMerge) {
    option = mergeObjects(option, optionMerge);
  }
  return option;
}