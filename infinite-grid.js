// One spatial position per format; only nearby documents enter the DOM.
export class InfiniteGrid {
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
    this.cardWidth = (this.width < 640 ? 170 : 220) * this.zoom;
    this.cardHeight = (this.width < 640 ? 215 : 275) * this.zoom;
    this.stepX = this.cardWidth + (this.width < 640 ? 36 : 70) * this.zoom;
    this.stepY = this.cardHeight + (this.width < 640 ? 32 : 58) * this.zoom;
    this.columns = Math.max(1,Math.ceil(Math.sqrt(this.items.length)));
    this.rows = Math.max(1,Math.ceil(this.items.length/this.columns));
    this.periodX = Math.max(this.columns*this.stepX+this.stepX/2,this.width+this.stepX*2);
    this.periodY = Math.max(this.rows*this.stepY,this.height+this.stepY*2);
    this.render();
  }

  render() {
    if (!this.items.length) return;
    const mod = (n, m) => ((n % m) + m) % m;
    const needed = new Set();
    for(let index=0;index<this.items.length;index++) {
      const row=Math.floor(index/this.columns),col=index%this.columns;
      const baseX=col*this.stepX+(row%2)*this.stepX/2+this.x,baseY=row*this.stepY+this.y;
      const left=mod(baseX-this.width/2+this.periodX/2,this.periodX)+this.width/2-this.periodX/2;
      const top=mod(baseY-this.height/2+this.periodY/2,this.periodY)+this.height/2-this.periodY/2;
      if(left>this.width+this.cardWidth||left+this.cardWidth < -this.cardWidth||top>this.height+this.cardHeight||top+this.cardHeight < -this.cardHeight)continue;
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
      const caption = document.createElement('span');
      caption.className = 'caption';
      const title = document.createElement('span');
      title.textContent = item.title;
      const meta = document.createElement('span');
      meta.className = 'tile-meta';
      const identifier = document.createElement('span');
      identifier.className = 'tile-id';
      identifier.textContent = String(item.archiveNumber || index + 1).padStart(3, '0');
      meta.textContent = item.category;
      caption.append(identifier, title, meta);
      cell.append(img, caption);
      this.layer.append(cell);
      this.cells.set(key, cell);
    }
        if (cell.layoutVersion !== this.layoutVersion) {
          const item = this.items[Number(cell.dataset.index)];
          const factor = [1, .82, .94, .78, .9][Number(cell.dataset.index) % 5];
          const maxW = this.cardWidth * factor;
          const maxH = this.cardHeight - 44;
          const ratio = (item.width || 1) / (item.height || 1);
          const imageW = Math.min(maxW, maxH * ratio);
          const imageH = imageW / ratio;
          const imageX = (this.cardWidth - imageW) / 2;
          const imageY = (maxH - imageH) / 2;
          cell.style.setProperty('--image-width', `${imageW}px`);
          cell.style.setProperty('--image-height', `${imageH}px`);
          cell.style.setProperty('--image-x', `${imageX}px`);
          cell.style.setProperty('--image-y', `${imageY}px`);
          cell.style.setProperty('--caption-y', `${imageY + imageH + 10}px`);
          cell.style.width = `${this.cardWidth}px`;
          cell.style.height = `${this.cardHeight}px`;
          cell.layoutVersion = this.layoutVersion;
        }
        cell.style.transform = `translate3d(${left}px,${top}px,0)`;
        const visible = left >= 0 && left + this.cardWidth <= this.width && top >= 0 && top + this.cardHeight <= this.height;
        const tabIndex = visible ? 0 : -1;
        if (cell.tabIndex !== tabIndex) cell.tabIndex = tabIndex;
        const hidden = String(left + this.cardWidth < 0 || left > this.width || top + this.cardHeight < 0 || top > this.height);
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
    const blend = this.motion.matches || this.pointer ? 1 : 1 - Math.exp(-dt / 65);
    this.x += (this.targetX - this.x) * blend;
    this.y += (this.targetY - this.y) * blend;
    // Keep coordinates numerically stable after very long navigation.
    const periods = [this.periodX, this.periodY];
    for (const [position, target, period] of [['x', 'targetX', periods[0]], ['y', 'targetY', periods[1]]]) {
      if (Math.abs(this[position]) > 1000000) {
        const shift = Math.trunc(this[position] / period) * period;
        this[position] -= shift;
        this[target] -= shift;
      }
    }
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
    if (e.ctrlKey || e.metaKey) return; // Preserve browser zoom.
    e.preventDefault();
    if (this.pointer) return;
    const unit = e.deltaMode === 1 ? 18 : e.deltaMode === 2 ? this.height : 1;
    this.vx = this.vy = 0;
    this.targetX -= (e.shiftKey && !e.deltaX ? e.deltaY : e.deltaX) * unit;
    this.targetY -= (e.shiftKey && !e.deltaX ? 0 : e.deltaY) * unit;
    this.wake();
  }

  down(e) {
    if (!this.items.length || !e.isPrimary || e.button !== 0 || this.pointer || e.target.closest('#empty')) return;
    this.vx = this.vy = 0;
    this.targetX = this.x;
    this.targetY = this.y;
    this.pointer = { id: e.pointerId, x: e.clientX, y: e.clientY, startX: e.clientX, startY: e.clientY, time: performance.now(), dragged: false };
    this.pointer.cell = e.target.closest('.tile');
    this.viewport.setPointerCapture(e.pointerId);
  }

  move(e) {
    const p = this.pointer;
    if (!p || p.id !== e.pointerId) return;
    if (!p.dragged && Math.hypot(e.clientX - p.startX, e.clientY - p.startY) < 6) return;
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
    this.wake();
  }

  up(e, cancelled = false) {
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
    const directions = { ArrowLeft: [160, 0], ArrowRight: [-160, 0], ArrowUp: [0, 160], ArrowDown: [0, -160] };
    if (e.key === 'Home') { e.preventDefault(); this.reset(); return; }
    const d = directions[e.key];
    if (!d) return;
    e.preventDefault();
    this.vx = this.vy = 0;
    this.targetX += d[0];
    this.targetY += d[1];
    this.wake();
  }

  setZoom(value) {
    this.stop();
    const previous = this.zoom;
    this.zoom = Math.max(.65, Math.min(1.4, Math.round(value * 100) / 100));
    const ratio = this.zoom / previous;
    this.x = this.targetX = this.width / 2 + (this.x - this.width / 2) * ratio;
    this.y = this.targetY = this.height / 2 + (this.y - this.height / 2) * ratio;
    this.resize();
    return this.zoom;
  }

  reset() {
    this.vx = this.vy = 0;
    this.x = this.targetX = this.items.length<=6?(this.width-(this.columns-1)*this.stepX-this.cardWidth)/2:-this.stepX/2;
    this.y = this.targetY = this.items.length<=6?(this.height-(this.rows-1)*this.stepY-this.cardHeight)/2:16;
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
