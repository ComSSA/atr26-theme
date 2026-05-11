import { colorHash } from "@ctfdio/ctfd-js/ui";
import { cumulativeSum } from "../../math";
import { mergeObjects } from "../../objects";
import dayjs from "dayjs";

export function getOption(id, name, solves, awards, optionMerge) {
  let option = {
    title: {
      left: "center",
      text: "Score over Time",
      textStyle: {
        color: "#7B2D21",
        fontFamily: "'Share Tech Mono', monospace",
      },
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
      data: [name],
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
        data: [],
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

  const times = [];
  const scores = [];
  const total = solves.concat(awards);

  total.sort((a, b) => {
    return new Date(a.date) - new Date(b.date);
  });

  for (let i = 0; i < total.length; i++) {
    const date = dayjs(total[i].date);
    times.push(date.toDate());
    try {
      scores.push(total[i].challenge.value);
    } catch (e) {
      scores.push(total[i].value);
    }
  }

  times.forEach(time => {
    option.xAxis[0].data.push(time.getTime());
  });

  const seriesData = times.map((time, index) => {
    return [time, cumulativeSum(scores)[index]];
  });

  option.series.push({
    name: name,
    type: "line",
    label: {
      normal: {
        show: true,
        position: "top",
        color: "#2B251D",
        fontFamily: "'Share Tech Mono', monospace",
      },
    },
    areaStyle: {
      normal: {
        color: colorHash(name + id),
        opacity: 0.4,
      },
    },
    itemStyle: {
      normal: {
        color: colorHash(name + id),
      },
    },
    data: seriesData,
  });

  if (optionMerge) {
    option = mergeObjects(option, optionMerge);
  }

  return option;
}