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

const MAP_ASSETS = {
  background: "/themes/atr26-theme/static/img/map.svg",
  red_seal: "/themes/atr26-theme/static/img/red_wax_seal.svg",
  grey_seal: "/themes/atr26-theme/static/img/grey_wax_seal.svg",
  rooms_config: "/atr26_game/api/rooms",
};

function loadImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

function tagsAsProps(tags) {
  const props = {};
  if (!tags) return props;
  for (const t of tags) {
    const idx = t.value.indexOf(":");
    if (idx < 0) {
      props[t.value] = true;
      continue;
    }
    const k = t.value.slice(0, idx);
    const v = t.value.slice(idx + 1);
    if (k) props[k] = v;
  }
  return props;
}

class MapManager {
  constructor(challenges) {
    this.challenges = challenges;
    this.icons = [];
    this.width = 1140;
    this.height = 554;
    this.roomsById = {};
    this.sealSize = 45;
    this.assets = {};
    this.registerMouseOverHook();
    this.render();
  }

  async render() {
    const [bg, red, grey, roomsResp] = await Promise.all([
      loadImage(MAP_ASSETS.background),
      loadImage(MAP_ASSETS.red_seal),
      loadImage(MAP_ASSETS.grey_seal),
      fetch(MAP_ASSETS.rooms_config).then(r => r.json()).catch(() => null),
    ]);
    this.assets = { bg, red, grey };

    if (roomsResp && roomsResp.success && roomsResp.data) {
      const cfg = roomsResp.data;
      this.sealSize = cfg.seal_size || this.sealSize;
      for (const r of cfg.rooms) this.roomsById[r.id] = r;
    }

    const canvas = document.getElementById("map");
    const ctx = canvas.getContext("2d");
    ctx.drawImage(bg, 0, 0, canvas.width, canvas.height);
    this.renderSeals(ctx);
  }

  renderSeals(ctx) {
    // Debug: `?seal_debug=1` draws a seal at every defined position so we
    // can visually tune rooms.json without needing real challenges to map.
    if (new URLSearchParams(window.location.search).has("seal_debug")) {
      this.icons = [];
      const size = this.sealSize;
      for (const roomId in this.roomsById) {
        const room = this.roomsById[roomId];
        const positions = room.positions || [];
        for (const pos of positions) {
          const x = pos.x - size / 2;
          const y = pos.y - size / 2;
          ctx.drawImage(this.assets.red, x, y, size, size);
        }
      }
      return;
    }

    // group unsolved tagged challenges by room
    const byRoom = {};
    for (const c of this.challenges) {
      if (c.solved_by_me) continue;
      if (!c.tags || c.tags.length === 0) continue;
      const props = tagsAsProps(c.tags);
      if (!props.room) continue;
      const room = this.roomsById[props.room];
      if (!room) continue;
      (byRoom[props.room] = byRoom[props.room] || []).push({ challenge: c, props });
    }

    this.icons = [];
    for (const roomId in byRoom) {
      const room = this.roomsById[roomId];
      const items = byRoom[roomId];
      items.sort((a, b) => a.challenge.id - b.challenge.id);
      this.drawRoomSeals(ctx, room, items);
    }
  }

  drawRoomSeals(ctx, room, items) {
    const positions = room.positions;
    if (!positions || positions.length === 0) return;
    const size = this.sealSize;

    for (let i = 0; i < items.length; i++) {
      const { challenge, props } = items[i];
      const pos = positions[i % positions.length];
      const dx = props.x_offset ? parseInt(props.x_offset, 10) || 0 : 0;
      const dy = props.y_offset ? parseInt(props.y_offset, 10) || 0 : 0;
      const x = pos.x - size / 2 + dx;
      const y = pos.y - size / 2 + dy;

      const available = props.available !== "false";
      const img = available ? this.assets.red : this.assets.grey;
      ctx.drawImage(img, x, y, size, size);
      this.icons.push({ x, y, width: size, height: size, task: challenge, room, available });
    }
  }

  registerMouseOverHook() {
    const canvas = document.getElementById("map");
    let hoveredIcon = null;

    canvas.addEventListener("mousemove", event => {
      const rect = canvas.getBoundingClientRect();
      const scaleX = rect.width / this.width;
      const scaleY = rect.height / this.height;
      const sx = (event.clientX - rect.left) / scaleX;
      const sy = (event.clientY - rect.top) / scaleY;

      let found = null;
      for (const icon of this.icons) {
        if (
          sx >= icon.x &&
          sx <= icon.x + icon.width &&
          sy >= icon.y &&
          sy <= icon.y + icon.height
        ) {
          found = icon;
          break;
        }
      }
      if (found) {
        hoveredIcon = found;
        canvas.style.cursor = found.available ? "pointer" : "not-allowed";
        const scrollX = window.scrollX || document.documentElement.scrollLeft;
        const scrollY = window.scrollY || document.documentElement.scrollTop;
        this.showTooltip(found, event.clientX + scrollX, event.clientY + scrollY);
      } else {
        hoveredIcon = null;
        canvas.style.cursor = "default";
        this.hideTooltip();
      }
    });

    canvas.addEventListener("mouseleave", () => {
      hoveredIcon = null;
      canvas.style.cursor = "default";
      this.hideTooltip();
    });

    canvas.addEventListener("click", async () => {
      if (!hoveredIcon || !hoveredIcon.available) return;
      const challengeId = hoveredIcon.task.id;
      if (!challengeId) return;
      this.hideTooltip();
      await CTFd.pages.challenge.displayChallenge(challengeId, challenge => {
        challenge.data.view = addTargetBlank(challenge.data.view);
        Alpine.store("challenge").data = challenge.data;
        Alpine.nextTick(() => {
          const modal = Modal.getOrCreateInstance("[x-ref='challengeWindow']");
          modal._element.addEventListener(
            "hidden.bs.modal",
            () => {
              history.replaceState(null, null, "/challenges");
            },
            { once: true },
          );
          modal.show();
          history.replaceState(null, null, `#${challenge.data.name}-${challengeId}`);
        });
      });
    });
  }

  showTooltip(icon, x, y) {
    let tooltip = document.getElementById("map-tooltip");
    if (!tooltip) {
      tooltip = document.createElement("div");
      tooltip.id = "map-tooltip";
      document.body.appendChild(tooltip);
    }

    const task = icon.task;
    let category = task.category;
    if (task.tags) {
      for (const tag of task.tags) {
        if (tag.value === "c:0") {
          category = "";
          break;
        }
      }
    }

    const roomLabel = icon.room ? icon.room.label : "";
    const statusLabel = icon.available ? "Available" : "Unavailable";
    const statusClass = icon.available ? "available" : "unavailable";

    tooltip.classList.toggle("unavailable", !icon.available);
    tooltip.innerHTML = `
      <div class="map-tooltip__name">${task.name}</div>
      <div class="map-tooltip__meta">
        ${category ? `<span class="map-tooltip__category">${category}</span>` : ""}
        ${task.value !== undefined ? `<span class="map-tooltip__value">${task.value} pts</span>` : ""}
      </div>
      ${roomLabel ? `<div class="map-tooltip__room">${roomLabel}</div>` : ""}
      <div class="map-tooltip__status map-tooltip__status--${statusClass}">${statusLabel}</div>
    `;

    // measure after content is set so the layout is current
    tooltip.style.visibility = "hidden";
    tooltip.classList.add("visible");
    const tw = tooltip.offsetWidth;
    const th = tooltip.offsetHeight;

    let adjX = x + 14;
    if (adjX + tw > window.innerWidth - 8) {
      adjX = Math.max(8, x - tw - 14);
    }
    let adjY = y + 14;
    if (adjY + th > window.innerHeight + window.scrollY - 8) {
      adjY = Math.max(8, y - th - 14);
    }
    tooltip.style.left = `${adjX}px`;
    tooltip.style.top = `${adjY}px`;
    tooltip.style.visibility = "";
  }

  hideTooltip() {
    const tooltip = document.getElementById("map-tooltip");
    if (tooltip) tooltip.classList.remove("visible");
  }
}