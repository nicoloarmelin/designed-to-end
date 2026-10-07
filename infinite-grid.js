// One spatial position per format; only nearby documents enter the DOM.
export class ArchiveGrid {
  constructor(viewport, layer, items, onSelect) {
    if (!items.length) throw new Error('The grid needs at least one item.');
    this.viewport = viewport;
    this.layer = layer;
    this.items = items;
    this.onSelect = onSelect;
    this.cells = new Map();
    this.x = this.y = this.targetX = this.targetY = 0;
    this.vx = this.vy = 0;
    this.frame = 0;
    this.pointer = null;
    this.touches = new Map();
    this.pinch = null;
    this.zoom = 1;
    this.suppressClickUntil = 0;
    this.motion = matchMedia('(prefers-reduced-motion: reduce)');
    this.events = new AbortController();
    const on = (el, name, fn, options = {}) => el.addEventListener(name, fn, { ...options, signal: this.events.signal });
    on(viewport, 'wheel', e => this.wheel(e), { passive: false });
    on(viewport, 'pointerdown', e => this.down(e));
    on(viewport, 'pointermove', e => this.move(e));
    on(viewport, 'pointerup', e => this.up(e));
    on(viewport, 'pointercancel', e => this.up(e, true));
    on(viewport, 'lostpointercapture', e => { if (this.pointer) this.up(e, true); });
    on(viewport, 'keydown', e => this.key(e));
    on(layer, 'click', e => {
      const cell = e.target.closest('.tile');
      if (cell && (e.detail === 0 || performance.now() > this.suppressClickUntil)) {
        this.vx = this.vy = 0;
        this.targetX = this.x;
        this.targetY = this.y;
        this.onSelect(this.items[Number(cell.dataset.index)], cell);
      }
    });
    this.resizeObserver = new ResizeObserver(() => this.resize());
    this.resizeObserver.observe(viewport);
    this.resize();
  }

  resize() {
    this.layoutVersion = (this.layoutVersion || 0) + 1;
    this.width = this.viewport.clientWidth;
    this.height = this.viewport.clientHeight;
    // Fixed, staggered positions with varied image scales and breathing space.
    this.baseWidth = 220;
    this.columns = Math.max(1, Math.ceil(Math.sqrt(this.items.length)));
    const widths = [240, 210, 260, 180, 235, 220, 250, 200, 230, 215];
    const offsets = [24, 0, 64, 120, 36, 90, 0, 48, 104, 20];
    const gaps = [48, 72, 56, 64, 40];
    const starts = [], heights = [];
    let cursor = 0;
    for (let column = 0; column < this.columns; column++) {
      starts.push(cursor); heights.push(offsets[column % offsets.length]);
      cursor += widths[column % widths.length] + gaps[column % gaps.length];
    }
    this.positions = this.items.map((item, index) => {
      const column = heights.indexOf(Math.min(...heights));
      const trackWidth = widths[column % widths.length];
      const scale = [1, .82, .94, .72, .88, 1, .78][index % 7];
      const ratio = (item.width || 1) / (item.height || 1);
      const imageHeight = Math.min(360, trackWidth * scale / ratio);
      const imageWidth = imageHeight * ratio;
      const height = Math.max(44, imageHeight);
      const alignment = [.08, .7, .3, .95, .5][index % 5];
      const position = { x: starts[column] + (trackWidth - imageWidth) * alignment,
        y: heights[column], width: imageWidth, height, imageWidth, imageHeight };
      heights[column] += height + [36, 72, 48, 92, 44, 60][index % 6];
      return position;
    });
    this.baseContentWidth = Math.max(44, ...this.positions.map(p => p.x + p.width));
    this.baseContentHeight = Math.max(44, ...this.positions.map(p => p.y + p.height));
    this.safeTop = this.width <= 700 ? 100 : this.width <= 1000 ? 150 : 100;
    this.safeBottom = this.width <= 700 ? 164 : 100;
    this.minZoom = Math.min(.65, Math.max(.04, Math.min(
      Math.max(40, this.width - 48) / this.baseContentWidth,
      Math.max(40, this.height - this.safeTop - this.safeBottom) / this.baseContentHeight
    )));
    this.zoom = Math.max(this.minZoom, Math.min(2, this.zoom));
    this.cardWidth = this.baseWidth * this.zoom;
    this.contentWidth = this.baseContentWidth * this.zoom;
    this.contentHeight = this.baseContentHeight * this.zoom;
    const fitX = (this.width - this.contentWidth) / 2;
    const fitY = this.safeTop + (this.height - this.safeTop - this.safeBottom - this.contentHeight) / 2;
    this.minX = this.contentWidth <= this.width - 48 ? fitX : this.width - 24 - this.contentWidth;
    this.maxX = this.contentWidth <= this.width - 48 ? fitX : 24;
    this.minY = this.contentHeight <= this.height - this.safeTop - this.safeBottom ? fitY : this.height - this.safeBottom - this.contentHeight;
    this.maxY = this.contentHeight <= this.height - this.safeTop - this.safeBottom ? fitY : this.safeTop;
    this.overview = this.zoom <= this.minZoom + .00001;
    if (this.overview) this.centerOverview();
    this.constrain();
    this.viewport.dispatchEvent(new CustomEvent('gridzoom', { detail: this.zoom }));
    this.render();
  }

  render() {
    if (!this.items.length) return;
    const needed = new Set();
    for(let index=0;index<this.items.length;index++) {
      const position = this.positions[index];
      const left = position.x * this.zoom + this.x, top = position.y * this.zoom + this.y;
      const width = position.width * this.zoom, height = position.height * this.zoom;
      if (left > this.width + width || left + width < -width || top > this.height + height || top + height < -height) continue;
      const key=String(index);needed.add(key);let cell=this.cells.get(key);
      if(!cell){
      const item = this.items[index];
      cell = document.createElement('button');
      cell.type = 'button';
      cell.tabIndex = -1;
      cell.className = 'tile';
      cell.dataset.index = index;
      cell.dataset.kind = item.kind || 'Marchio';
      cell.style.setProperty('--image-background', item.background || '#f5f3ef');
      cell.setAttribute('aria-label', `Apri la scheda del formato ${item.title}`);
      const img = document.createElement('img');
      img.src = item.thumb || item.src;
      img.alt = item.title;
      img.draggable = false;
      img.decoding = 'async';
      img.loading = 'lazy';
      img.width = item.width || 1;
      img.height = item.height || 1;
      cell.append(img);
      this.layer.append(cell);
      this.cells.set(key, cell);
    }
        if (cell.layoutVersion !== this.layoutVersion) {
          const imageW = position.imageWidth * this.zoom;
          const imageH = position.imageHeight * this.zoom;
          cell.style.setProperty('--image-width', `${imageW}px`);
          cell.style.setProperty('--image-height', `${imageH}px`);
          cell.style.setProperty('--image-x', `${(width - imageW) / 2}px`);
          cell.style.setProperty('--image-y', `${(height - imageH) / 2}px`);
          cell.style.width = `${width}px`;
          cell.style.height = `${height}px`;
          cell.layoutVersion = this.layoutVersion;
        }
        cell.style.transform = `translate3d(${left}px,${top}px,0)`;
        const visible = left >= 0 && left + width <= this.width && top >= 0 && top + height <= this.height;
        const tabIndex = visible ? 0 : -1;
        if (cell.tabIndex !== tabIndex) cell.tabIndex = tabIndex;
        const hidden = String(left + width < 0 || left > this.width || top + height < 0 || top > this.height);
        if (cell.getAttribute('aria-hidden') !== hidden) cell.setAttribute('aria-hidden', hidden);
    }
    for (const [key, cell] of this.cells) {
      if (!needed.has(key)) {
        if (cell === document.activeElement) this.viewport.focus({ preventScroll: true });
        cell.remove();
        this.cells.delete(key);
      }
    }
  }

  wake() {
    if (this.frame) return;
    this.lastFrame = performance.now();
    this.frame = requestAnimationFrame(time => this.tick(time));
  }

  tick(time) {
    const dt = Math.min(time - this.lastFrame, 32);
    this.lastFrame = time;
    if (!this.pointer) {
      this.targetX += this.vx * dt;
      this.targetY += this.vy * dt;
      const friction = Math.exp(-dt / 165);
      this.vx *= friction;
      this.vy *= friction;
    }
    this.constrain();
    const blend = this.motion.matches || this.pointer ? 1 : 1 - Math.exp(-dt / 65);
    this.x += (this.targetX - this.x) * blend;
    this.y += (this.targetY - this.y) * blend;
    this.render();
    const active = Math.abs(this.targetX - this.x) + Math.abs(this.targetY - this.y) > 0.1 || Math.abs(this.vx) + Math.abs(this.vy) > 0.01;
    if (active) this.frame = requestAnimationFrame(t => this.tick(t));
    else {
      this.x = this.targetX;
      this.y = this.targetY;
      this.vx = this.vy = 0;
      this.render();
      this.frame = 0;
    }
  }

  wheel(e) {
    e.preventDefault();
    if (this.pointer || this.pinch) return;
    const unit = e.deltaMode === 1 ? 18 : e.deltaMode === 2 ? this.height : 1;
    if (e.ctrlKey || e.metaKey || e.altKey) {
      const bounds = this.viewport.getBoundingClientRect();
      this.setZoom(this.zoom * Math.exp(-e.deltaY * unit * .008), e.clientX - bounds.left, e.clientY - bounds.top);
      return;
    }
    if (this.overview) return;
    this.vx = this.vy = 0;
    this.targetX -= (e.shiftKey && !e.deltaX ? e.deltaY : e.deltaX) * unit;
    this.targetY -= (e.shiftKey && !e.deltaX ? 0 : e.deltaY) * unit;
    this.constrain();
    this.wake();
  }

  down(e) {
    if (e.pointerType === 'touch') {
      this.touches.set(e.pointerId, { x: e.clientX, y: e.clientY });
      if (this.touches.size === 2) {
        const [a, b] = [...this.touches.values()];
        this.stop();
        this.pointer = null;
        this.viewport.classList.remove('dragging');
        this.pinch = { distance: Math.max(1, Math.hypot(a.x - b.x, a.y - b.y)), zoom: this.zoom };
        this.viewport.setPointerCapture(e.pointerId);
        return;
      }
      if (this.touches.size > 2) return;
    }
    if (!this.items.length || !e.isPrimary || e.button !== 0 || this.pointer || e.target.closest('#empty')) return;
    this.vx = this.vy = 0;
    this.targetX = this.x;
    this.targetY = this.y;
    this.pointer = { id: e.pointerId, x: e.clientX, y: e.clientY, startX: e.clientX, startY: e.clientY, time: performance.now(), dragged: false };
    this.pointer.cell = e.target.closest('.tile');
    this.viewport.setPointerCapture(e.pointerId);
  }

  move(e) {
    if (this.touches.has(e.pointerId)) this.touches.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (this.pinch && this.touches.size >= 2) {
      const [a, b] = [...this.touches.values()], bounds = this.viewport.getBoundingClientRect();
      this.setZoom(this.pinch.zoom * Math.hypot(a.x - b.x, a.y - b.y) / this.pinch.distance,
        (a.x + b.x) / 2 - bounds.left, (a.y + b.y) / 2 - bounds.top);
      this.viewport.classList.add('explored');
      return;
    }
    const p = this.pointer;
    if (!p || p.id !== e.pointerId) return;
    if (!p.dragged && Math.hypot(e.clientX - p.startX, e.clientY - p.startY) < 6) return;
    if (this.overview) return;
    if (!p.dragged) {
      p.dragged = true;
      this.viewport.classList.add('dragging');
      this.viewport.focus({ preventScroll: true });
    }
    const now = performance.now();
    const dt = Math.max(now - p.time, 8);
    const dx = e.clientX - p.x;
    const dy = e.clientY - p.y;
    this.targetX += dx;
    this.targetY += dy;
    this.vx = this.vx * .35 + Math.max(-3, Math.min(3, dx / dt)) * .65;
    this.vy = this.vy * .35 + Math.max(-3, Math.min(3, dy / dt)) * .65;
    p.x = e.clientX;
    p.y = e.clientY;
    p.time = now;
    this.constrain();
    this.wake();
  }

  up(e, cancelled = false) {
    this.touches.delete(e.pointerId);
    if (this.pinch) {
      this.pinch = null;
      this.pointer = null;
      this.suppressClickUntil = performance.now() + 350;
      if (this.viewport.hasPointerCapture(e.pointerId)) this.viewport.releasePointerCapture(e.pointerId);
      return;
    }
    const p = this.pointer;
    if (!p || p.id !== e.pointerId) return;
    this.suppressClickUntil = performance.now() + 350;
    if (cancelled || this.motion.matches || performance.now() - p.time > 90) this.vx = this.vy = 0;
    this.pointer = null;
    this.viewport.classList.remove('dragging');
    if (this.viewport.hasPointerCapture(e.pointerId)) this.viewport.releasePointerCapture(e.pointerId);
    this.wake();
    if (!p.dragged && !cancelled && p.cell) this.onSelect(this.items[Number(p.cell.dataset.index)], p.cell);
  }

  key(e) {
    if (e.ctrlKey || e.metaKey || e.altKey) return; // Keep browser keyboard zoom available.
    const directions = { ArrowLeft: [160, 0], ArrowRight: [-160, 0], ArrowUp: [0, 160], ArrowDown: [0, -160] };
    if (e.key === '+' || e.key === '=' || e.key === '-') {
      e.preventDefault(); this.setZoom(this.zoom * (e.key === '-' ? 1 / 1.2 : 1.2));
      this.viewport.classList.add('explored'); return;
    }
    if (e.key === 'Home') { e.preventDefault(); this.reset(); return; }
    const d = directions[e.key];
    if (!d || this.overview) return;
    e.preventDefault();
    this.vx = this.vy = 0;
    this.targetX += d[0];
    this.targetY += d[1];
    this.constrain();
    this.wake();
  }

  setZoom(value, anchorX = this.width / 2, anchorY = this.height / 2) {
    this.stop();
    const previous = this.zoom;
    this.zoom = Math.max(this.minZoom, Math.min(2, value));
    const ratio = this.zoom / previous;
    this.x = this.targetX = anchorX + (this.x - anchorX) * ratio;
    this.y = this.targetY = anchorY + (this.y - anchorY) * ratio;
    this.resize();
    return this.zoom;
  }

  constrain() {
    for (const [position, target, velocity, min, max] of [
      ['x', 'targetX', 'vx', this.minX, this.maxX],
      ['y', 'targetY', 'vy', this.minY, this.maxY]
    ]) {
      const clamped = Math.max(min, Math.min(max, this[target]));
      if (clamped !== this[target]) this[velocity] = 0;
      this[target] = clamped;
      this[position] = Math.max(min, Math.min(max, this[position]));
    }
  }

  centerOverview() {
    const contentWidth = this.contentWidth;
    const contentHeight = this.contentHeight;
    this.x = this.targetX = (this.width - contentWidth) / 2;
    this.y = this.targetY = this.safeTop + (this.height - this.safeTop - this.safeBottom - contentHeight) / 2;
    this.vx = this.vy = 0;
  }

  reset() {
    if (this.overview) { this.centerOverview(); this.render(); return; }
    this.vx = this.vy = 0;
    this.x = this.targetX = this.maxX;
    this.y = this.targetY = this.maxY;
    this.constrain();
    this.render();
  }

  stop() {
    this.vx = this.vy = 0;
    this.targetX = this.x;
    this.targetY = this.y;
    cancelAnimationFrame(this.frame);
    this.frame = 0;
  }

  setItems(items) {
    this.stop();
    const pointer = this.pointer;
    this.pointer = null;
    if (pointer && this.viewport.hasPointerCapture(pointer.id)) this.viewport.releasePointerCapture(pointer.id);
    this.viewport.classList.remove('dragging');
    this.touches.clear();
    this.pinch = null;
    this.items = items;
    this.layer.replaceChildren();
    this.cells.clear();
    this.resize();
    this.reset();
  }

  destroy() {
    this.events.abort();
    this.resizeObserver.disconnect();
    cancelAnimationFrame(this.frame);
    this.layer.replaceChildren();
    this.cells.clear();
  }
}
