import { colorHash } from "@ctfdio/ctfd-js/ui";
import { mergeObjects } from "../../objects";
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
          color: colorHash(places[teams[i]]["name"] + places[teams[i]]["id"]),
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