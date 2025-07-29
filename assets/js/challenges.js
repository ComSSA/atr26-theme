import Alpine from "alpinejs";
import dayjs from "dayjs";

import CTFd from "./index";

import { Modal, Tab, Tooltip } from "bootstrap";
import highlight from "./theme/highlight";

function addTargetBlank(html) {
  let dom = new DOMParser();
  let view = dom.parseFromString(html, "text/html");
  let links = view.querySelectorAll('a[href*="://"]');
  links.forEach(link => {
    link.setAttribute("target", "_blank");
  });
  return view.documentElement.outerHTML;
}

window.Alpine = Alpine;

Alpine.store("challenge", {
  data: {
    view: "",
  },
});

Alpine.data("Hint", () => ({
  id: null,
  html: null,

  async showHint(event) {
    if (event.target.open) {
      let response = await CTFd.pages.challenge.loadHint(this.id);
      let hint = response.data;
      if (hint.content) {
        this.html = addTargetBlank(hint.html);
      } else {
        let answer = await CTFd.pages.challenge.displayUnlock(this.id);
        if (answer) {
          let unlock = await CTFd.pages.challenge.loadUnlock(this.id);

          if (unlock.success) {
            let response = await CTFd.pages.challenge.loadHint(this.id);
            let hint = response.data;
            this.html = addTargetBlank(hint.html);
          } else {
            event.target.open = false;
            CTFd._functions.challenge.displayUnlockError(unlock);
          }
        } else {
          event.target.open = false;
        }
      }
    }
  },
}));

Alpine.data("Challenge", () => ({
  id: null,
  next_id: null,
  submission: "",
  tab: null,
  solves: [],
  response: null,
  share_url: null,
  max_attempts: 0,
  attempts: 0,

  async init() {
    highlight();
  },

  getStyles() {
    let styles = {
      "modal-dialog": true,
    };
    try {
      let size = CTFd.config.themeSettings.challenge_window_size;
      switch (size) {
        case "sm":
          styles["modal-sm"] = true;
          break;
        case "lg":
          styles["modal-lg"] = true;
          break;
        case "xl":
          styles["modal-xl"] = true;
          break;
        default:
          break;
      }
    } catch (error) {
      // Ignore errors with challenge window size
      console.log("Error processing challenge_window_size");
      console.log(error);
    }
    return styles;
  },

  async init() {
    highlight();
  },

  async showChallenge() {
    new Tab(this.$el).show();
  },

  async showSolves() {
    this.solves = await CTFd.pages.challenge.loadSolves(this.id);
    this.solves.forEach(solve => {
      solve.date = dayjs(solve.date).format("MMMM Do, h:mm:ss A");
      return solve;
    });
    new Tab(this.$el).show();
  },

  getNextId() {
    let data = Alpine.store("challenge").data;
    return data.next_id;
  },

  async nextChallenge() {
    let modal = Modal.getOrCreateInstance("[x-ref='challengeWindow']");

    // TODO: Get rid of this private attribute access
    // See https://github.com/twbs/bootstrap/issues/31266
    modal._element.addEventListener(
      "hidden.bs.modal",
      event => {
        // Dispatch load-challenge event to call loadChallenge in the ChallengeBoard
        Alpine.nextTick(() => {
          this.$dispatch("load-challenge", this.getNextId());
        });
      },
      { once: true },
    );
    modal.hide();
  },

  async getShareUrl() {
    let body = {
      type: "solve",
      challenge_id: this.id,
    };
    const response = await CTFd.fetch("/api/v1/shares", {
      method: "POST",
      body: JSON.stringify(body),
    });
    const data = await response.json();
    const url = data["data"]["url"];
    this.share_url = url;
  },

  copyShareUrl() {
    navigator.clipboard.writeText(this.share_url);
    let t = Tooltip.getOrCreateInstance(this.$el);
    t.enable();
    t.show();
    setTimeout(() => {
      t.hide();
      t.disable();
    }, 2000);
  },

  async submitChallenge() {
    this.response = await CTFd.pages.challenge.submitChallenge(
      this.id,
      this.submission,
    );

    await this.renderSubmissionResponse();
  },

  async renderSubmissionResponse() {
    if (this.response.data.status === "correct") {
      this.submission = "";
    }

    // Increment attempts counter
    if (this.max_attempts > 0 && this.response.data.status != "already_solved") {
      this.attempts += 1;
    }

    // Dispatch load-challenges event to call loadChallenges in the ChallengeBoard
    this.$dispatch("load-challenges");
  },
}));

Alpine.data("ChallengeBoard", () => ({
  loaded: false,
  challenges: [],
  challenge: null,

  async init() {
    this.challenges = await CTFd.pages.challenges.getChallenges();
    window["mapManager"] = new MapManager(this.challenges);
    this.loaded = true;

    if (window.location.hash) {
      let chalHash = decodeURIComponent(window.location.hash.substring(1));
      let idx = chalHash.lastIndexOf("-");
      if (idx >= 0) {
        let pieces = [chalHash.slice(0, idx), chalHash.slice(idx + 1)];
        let id = pieces[1];
        await this.loadChallenge(id);
      }
    }
  },

  getCategories() {
    const categories = [];

    this.challenges.forEach(challenge => {
      const { category } = challenge;

      if (!categories.includes(category)) {
        categories.push(category);
      }
    });

    try {
      const f = CTFd.config.themeSettings.challenge_category_order;
      if (f) {
        const getSort = new Function(`return (${f})`);
        categories.sort(getSort());
      }
    } catch (error) {
      // Ignore errors with theme category sorting
      console.log("Error running challenge_category_order function");
      console.log(error);
    }

    return categories;
  },

  getChallenges(category) {
    let challenges = this.challenges;

    if (category !== null) {
      challenges = this.challenges.filter(challenge => challenge.category === category);
    }

    try {
      const f = CTFd.config.themeSettings.challenge_order;
      if (f) {
        const getSort = new Function(`return (${f})`);
        challenges.sort(getSort());
      }
    } catch (error) {
      // Ignore errors with theme challenge sorting
      console.log("Error running challenge_order function");
      console.log(error);
    }

    return challenges;
  },

  async loadChallenges() {
    this.challenges = await CTFd.pages.challenges.getChallenges();
    window["mapManager"] = new MapManager(this.challenges);
  },

  async loadChallenge(challengeId) {
    await CTFd.pages.challenge.displayChallenge(challengeId, challenge => {
      challenge.data.view = addTargetBlank(challenge.data.view);
      Alpine.store("challenge").data = challenge.data;

      // nextTick is required here because we're working in a callback
      Alpine.nextTick(() => {
        let modal = Modal.getOrCreateInstance("[x-ref='challengeWindow']");
        // TODO: Get rid of this private attribute access
        // See https://github.com/twbs/bootstrap/issues/31266
        modal._element.addEventListener(
          "hidden.bs.modal",
          event => {
            // Remove location hash
            history.replaceState(null, null, " ");
          },
          { once: true },
        );
        modal.show();
        history.replaceState(null, null, `#${challenge.data.name}-${challengeId}`);
      });
    });
  },
}));

Alpine.start();

class MapManager {
  constructor(challenges) {
    this.challenges = challenges;
    this.icons = [];
    this.registerMouseOverHook();
    this.width = 1020;
    this.height = 496;
    this.render();
  }

  getChallenges() {
    return this.challenges;
  }

  async render() {
    await this.renderBackground();
    await this.renderRoomText();
    await this.renderTasks();
  }

  async renderBackground() {
    const canvas = document.getElementById("map");
    const ctx = canvas.getContext("2d");
    const img = new Image();
    img.src = "/themes/atr25-theme/static/img/map.svg";
    await new Promise(resolve => {
      img.onload = () => {
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      resolve();
      };
    });
  }

  async renderRoomText() {
    const templateTexts = [
      { text: "Main Hall", x: 764, y: 404 },
      { text: "Reception", x: 350, y: 380 },
      { text: "Deepwell|Archive", x: 90, y: 363 },
      { text: "Cafeteria", x: 150, y: 100 },
      { text: "Terrestrial|History", x: 363, y: 100 },
      { text: "Astral|Sciences", x: 560, y: 100 },
      { text: "Staff Halls", x: 753, y: 100 },
      { text: "The Lion's|Eye|Diamond", x: 944, y: 100 },
    ];
    let texts = templateTexts;
    if (window["serverTexts"]) {
      // For manual overrides if needed during an event, loading from the injected header
      texts = window["serverTexts"];
    }
    const canvas = document.getElementById("map");
    const ctx = canvas.getContext("2d");

    ctx.font = "26px Arial";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.strokeStyle = "black";
    ctx.lineWidth = 4;
    ctx.fillStyle = "white";
    for (let i = 0; i < texts.length; i++) {
      const text = texts[i];
      const lines = text.text.split("|");
      const lineHeight = 36;
      const startY = text.y - (lines.length - 1) * (lineHeight / 2);

      for (let j = 0; j < lines.length; j++) {
        const lineY = startY + j * lineHeight;
        ctx.strokeText(lines[j], text.x, lineY);
        ctx.fillText(lines[j], text.x, lineY);
      }
    }
  }

  async renderTasks() {
    // filter down to tasks with tags and not already complete
    let tasks = this.challenges.filter(challenge => {
      return challenge.tags && challenge.tags.length > 0 && !challenge.solved_by_me;
    });
    // adding new tasks icons to mapRoot
    for (let i = 0; i < tasks.length; i++) {
      const task = tasks[i];
      const props = {};

      // decode tags
      for (let j = 0; j < task.tags.length; j++) {
        const split = task.tags[j].value.split(":");
        const key = split[0];
        const value = split[1];
        if (key && value) {
          props[key] = value;
        }
      }

      const canvas = document.getElementById("map");
      const ctx = canvas.getContext("2d");

      // Ensure props.x and props.y exist and are numbers
      if (props.x && props.y) {
        const x = parseInt(props.x);
        const y = parseInt(props.y);

        const img = new Image();
        img.src = "/themes/atr25-theme/static/img/task.png";
        img.onload = () => {
          ctx.drawImage(img, x, y, 49, 49);
          this.icons.push({ x, y, width: 49, height: 49, task });
        };
      }
    }
  }

  registerMouseOverHook() {
    const canvas = document.getElementById("map");
    let hoveredTask = null;

    canvas.addEventListener("mousemove", event => {
      const rect = canvas.getBoundingClientRect();
      const mouseX = event.clientX - rect.left;
      const mouseY = event.clientY - rect.top;

      const scaleX = rect.width / this.width;
      const scaleY = rect.height / this.height;

      // scaled mouse position against 1000x500
      const scaledX = mouseX / scaleX;
      const scaledY = mouseY / scaleY;

      // check if mouse is over any icon
      let found = false;
      for (let i = 0; i < this.icons.length; i++) {
        const icon = this.icons[i];
        if (
          scaledX >= icon.x &&
          scaledX <= icon.x + icon.width &&
          scaledY >= icon.y &&
          scaledY <= icon.y + icon.height
        ) {
          found = true;
          hoveredTask = icon.task; // Store the hovered task
          const scrollX = window.scrollX || document.documentElement.scrollLeft;
          const scrollY = window.scrollY || document.documentElement.scrollTop;
          this.showTooltip(icon.task, event.clientX + scrollX, event.clientY + scrollY);
          canvas.style.cursor = "pointer";
          break;
        }
      }
      if (!found) {
        hoveredTask = null; // Reset hovered task
        canvas.style.cursor = "default";
        this.hideTooltip();
      }
    });

    canvas.addEventListener("click", async () => {
      if (hoveredTask) {
        const challengeId = hoveredTask.id; 
        if (challengeId) {
          this.hideTooltip();
          await CTFd.pages.challenge.displayChallenge(challengeId, challenge => {
            challenge.data.view = addTargetBlank(challenge.data.view);
            Alpine.store("challenge").data = challenge.data;

            Alpine.nextTick(() => {
              let modal = Modal.getOrCreateInstance("[x-ref='challengeWindow']");
              modal._element.addEventListener(
                "hidden.bs.modal",
                () => {
                  // Replace history state back to /challenges when modal is closed
                  history.replaceState(null, null, "/challenges");
                },
                { once: true }
              );
              modal.show();
              history.replaceState(null, null, `#${challenge.data.name}-${challengeId}`);
            });
          });
        }
      }
    });
  }

  showTooltip(task, x, y) {
    let tooltip = document.getElementById("map-tooltip");
    if (!tooltip) {
      tooltip = document.createElement("div");
      tooltip.id = "map-tooltip";
      document.body.appendChild(tooltip);
    }

    let category = task.category;
    // if there is a tag of c:0, then don't show category
    if (task.tags) {
      for (let i = 0; i < task.tags.length; i++) {
        const tag = task.tags[i];
        if (tag.value === "c:0") {
          category = "";
          break;
        }
      }
    }
    // Create a shadow copy element to determine the width
    let shadowTooltip = document.createElement("div");
    shadowTooltip.style.position = "absolute";
    shadowTooltip.style.visibility = "hidden";
    shadowTooltip.style.whiteSpace = "nowrap";
    shadowTooltip.innerHTML = `
      <div>${task.name}</div>
      <div>${category != "" ? category + " - " : ""}${task.value}</div>
    `;
    document.body.appendChild(shadowTooltip);

    const tooltipWidth = shadowTooltip.offsetWidth;
    document.body.removeChild(shadowTooltip);

    const screenWidth = window.innerWidth;

    // Check if the tooltip would overflow on the right side of the screen
    let adjustedX = x + 10;
    if (adjustedX + tooltipWidth > screenWidth) {
      adjustedX = x - tooltipWidth - 10; // Align to the left side
    }

    tooltip.innerHTML = `
      <div>${task.name}</div>
      <div>${category != "" ? category + " - " : ""}${task.value}</div>
    `;
    tooltip.style.left = `${adjustedX}px`;
    tooltip.style.top = `${y + 10}px`;
    tooltip.classList.add("visible");
    }

  hideTooltip() {
    const tooltip = document.getElementById("map-tooltip");
    if (tooltip) {
      tooltip.classList.remove("visible");
    }
  }
}