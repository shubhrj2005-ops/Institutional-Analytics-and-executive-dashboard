/*
 * Hand-drawn SVG charts. No chart library, so the dashboard works offline.
 * Each chart reads its container's width and draws at that size, so text stays readable on phones.
 */
(function (root) {
  'use strict';

  function esc(s) {
    return String(s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; });
  }
  function defaultFmt(v) { return Number(v).toLocaleString('en-IN', { maximumFractionDigits: 1 }); }

  function niceStep(range, count) {
    var raw = range / Math.max(1, count);
    var p = Math.pow(10, Math.floor(Math.log10(raw)));
    var m = raw / p;
    return (m <= 1 ? 1 : m <= 2 ? 2 : m <= 2.5 ? 2.5 : m <= 5 ? 5 : 10) * p;
  }
  function ticks(min, max, count) {
    if (max <= min) max = min + 1;
    var st = niceStep(max - min, count || 4);
    var lo = Math.floor(min / st) * st, hi = Math.ceil(max / st) * st, out = [];
    for (var v = lo; v <= hi + st / 1e6; v += st) out.push(+v.toFixed(6));
    return out;
  }
  function widthOf(el) { return Math.max(260, Math.floor(el.clientWidth || 600)); }
  function svgOpen(W, H, label) { return '<svg viewBox="0 0 ' + W + ' ' + H + '" width="' + W + '" height="' + H + '" role="img" aria-label="' + esc(label || '') + '">'; }
  function clip(s, n) { s = String(s); return s.length > n ? s.slice(0, n - 1) + '…' : s; }

  // Horizontal bars. items: [{label, value, cls, key, title}]
  function hbar(el, items, o) {
    o = o || {};
    var fmt = o.fmt || defaultFmt, W = widthOf(el), rowH = 30, top = 6, n = items.length;
    var left = o.labelWidth || Math.min(150, Math.max(48, 7.2 * Math.max.apply(null, items.map(function (i) { return clip(i.label, 20).length; }).concat([3])) + 10));
    var right = 64, H = top + n * rowH + 24;
    var dataMax = Math.max.apply(null, items.map(function (i) { return i.value || 0; }).concat([0]));
    var tk = o.max != null ? ticks(0, o.max, 4).filter(function (t) { return t <= o.max; }) : ticks(0, dataMax || 1, 4);
    var xmax = o.max != null ? o.max : tk[tk.length - 1];
    function x(v) { return left + (v / xmax) * (W - left - right); }
    var s = svgOpen(W, H, o.label);
    tk.forEach(function (t) {
      s += '<line class="grid" x1="' + x(t) + '" x2="' + x(t) + '" y1="' + top + '" y2="' + (top + n * rowH) + '"/>';
      s += '<text class="tick" x="' + x(t) + '" y="' + (top + n * rowH + 16) + '" text-anchor="middle">' + esc(fmt(t)) + '</text>';
    });
    items.forEach(function (it, i) {
      var y = top + i * rowH + 6, h = rowH - 12, w = Math.max(0, x(it.value || 0) - left);
      s += '<g' + (it.key ? ' class="pick" data-key="' + esc(it.key) + '" tabindex="0"' : '') + '>';
      s += '<title>' + esc(it.title || (it.label + ': ' + fmt(it.value))) + '</title>';
      s += '<text class="lab" x="' + (left - 8) + '" y="' + (y + h / 2 + 4) + '" text-anchor="end">' + esc(clip(it.label, 20)) + '</text>';
      s += '<rect class="bar ' + (it.cls || '') + '" x="' + left + '" y="' + y + '" width="' + w + '" height="' + h + '" rx="2"/>';
      s += '<text class="val" x="' + (left + w + 6) + '" y="' + (y + h / 2 + 4) + '">' + esc(fmt(it.value)) + '</text></g>';
    });
    if (o.threshold != null) {
      var tx = x(o.threshold);
      s += '<line class="thr" x1="' + tx + '" x2="' + tx + '" y1="' + (top - 4) + '" y2="' + (top + n * rowH) + '"/>';
    }
    el.innerHTML = s + '</svg>';
    bindPick(el, o.onPick);
  }

  // Vertical bars, one or more series side by side. d: {labels, series:[{name, values, cls, clsEach}]}
  function vbar(el, d, o) {
    o = o || {};
    var fmt = o.fmt || defaultFmt, W = widthOf(el), H = o.height || 220, top = 18, bottom = 26;
    var all = [];
    d.series.forEach(function (sr) { all = all.concat(sr.values); });
    var tk = ticks(0, Math.max.apply(null, all.concat([1])), 4), ymax = tk[tk.length - 1];
    var left = 12 + 7 * Math.max.apply(null, tk.map(function (t) { return fmt(t).length; })), right = 8;
    function y(v) { return top + (1 - v / ymax) * (H - top - bottom); }
    var n = d.labels.length, band = (W - left - right) / n, inner = band * (d.series.length > 1 ? 0.76 : 0.62), bw = inner / d.series.length;
    var showVals = o.values !== false && d.series.length === 1 && band > 26;
    var every = Math.ceil(n / Math.max(1, Math.floor((W - left) / 46)));
    var s = svgOpen(W, H, o.label);
    tk.forEach(function (t) {
      s += '<line class="grid" x1="' + left + '" x2="' + (W - right) + '" y1="' + y(t) + '" y2="' + y(t) + '"/>';
      s += '<text class="tick" x="' + (left - 6) + '" y="' + (y(t) + 4) + '" text-anchor="end">' + esc(fmt(t)) + '</text>';
    });
    d.labels.forEach(function (lab, i) {
      var x0 = left + i * band + (band - inner) / 2;
      d.series.forEach(function (sr, k) {
        var v = sr.values[i] || 0, bx = x0 + k * bw, by = y(v), cls = (sr.clsEach && sr.clsEach[i]) || sr.cls || '';
        s += '<g><title>' + esc((sr.name ? sr.name + ', ' : '') + lab + ': ' + fmt(v)) + '</title>';
        s += '<rect class="bar ' + cls + '" x="' + (bx + 1) + '" y="' + by + '" width="' + Math.max(1, bw - 2) + '" height="' + (y(0) - by) + '" rx="2"/></g>';
        if (showVals) s += '<text class="val" x="' + (bx + bw / 2) + '" y="' + (by - 5) + '" text-anchor="middle">' + esc(fmt(v)) + '</text>';
      });
      if (i % every === 0) s += '<text class="tick" x="' + (left + i * band + band / 2) + '" y="' + (H - 8) + '" text-anchor="middle">' + esc(clip(lab, 12)) + '</text>';
    });
    s += '<line class="axis" x1="' + left + '" x2="' + (W - right) + '" y1="' + y(0) + '" y2="' + y(0) + '"/>';
    el.innerHTML = s + '</svg>';
  }

  // Lines over a shared x axis. d: {labels, series:[{name, values, cls}]}, o.threshold: {value, label}
  function line(el, d, o) {
    o = o || {};
    var fmt = o.fmt || defaultFmt, W = widthOf(el), H = o.height || 220, top = 16, bottom = 26, right = 40;
    var all = [];
    d.series.forEach(function (sr) { all = all.concat(sr.values.filter(function (v) { return v != null; })); });
    if (o.threshold) all.push(o.threshold.value);
    var lo = o.min != null ? o.min : Math.min.apply(null, all), hi = o.max != null ? o.max : Math.max.apply(null, all);
    var pad = (hi - lo) * 0.12 || 1;
    var tk = ticks(o.min != null ? lo : lo - pad, o.max != null ? hi : hi + pad, 4), ymin = tk[0], ymax = tk[tk.length - 1];
    var left = 12 + 7 * Math.max.apply(null, tk.map(function (t) { return fmt(t).length; }));
    var n = d.labels.length;
    function x(i) { return left + (n === 1 ? 0.5 : i / (n - 1)) * (W - left - right); }
    function y(v) { return top + (1 - (v - ymin) / (ymax - ymin)) * (H - top - bottom); }
    var every = Math.ceil(n / Math.max(1, Math.floor((W - left) / 64)));
    var s = svgOpen(W, H, o.label);
    tk.forEach(function (t) {
      s += '<line class="grid" x1="' + left + '" x2="' + (W - right) + '" y1="' + y(t) + '" y2="' + y(t) + '"/>';
      s += '<text class="tick" x="' + (left - 6) + '" y="' + (y(t) + 4) + '" text-anchor="end">' + esc(fmt(t)) + '</text>';
    });
    d.labels.forEach(function (lab, i) {
      if (i % every === 0 || i === n - 1) s += '<text class="tick" x="' + x(i) + '" y="' + (H - 8) + '" text-anchor="middle">' + esc(lab) + '</text>';
    });
    if (o.threshold) {
      var ty = y(o.threshold.value);
      s += '<line class="thr" x1="' + left + '" x2="' + (W - right) + '" y1="' + ty + '" y2="' + ty + '"/>';
      s += '<text class="thr-lab" x="' + (W - right) + '" y="' + (ty - 5) + '" text-anchor="end">' + esc(o.threshold.label) + '</text>';
    }
    d.series.forEach(function (sr) {
      var pts = [];
      sr.values.forEach(function (v, i) { if (v != null) pts.push([x(i), y(v), v, i]); });
      if (!pts.length) return;
      s += '<polyline class="ln ' + (sr.cls || '') + '" points="' + pts.map(function (p) { return p[0].toFixed(1) + ',' + p[1].toFixed(1); }).join(' ') + '"/>';
      pts.forEach(function (p, k) {
        var last = k === pts.length - 1;
        s += '<g><title>' + esc((sr.name ? sr.name + ', ' : '') + d.labels[p[3]] + ': ' + fmt(p[2])) + '</title><circle class="dot ' + (sr.cls || '') + '" cx="' + p[0] + '" cy="' + p[1] + '" r="' + (last ? 4.5 : 3) + '"/></g>';
        if (last && !sr.noLabel) s += '<text class="val" x="' + (p[0] + 7) + '" y="' + (p[1] + 4) + '">' + esc(fmt(p[2])) + '</text>';
      });
    });
    el.innerHTML = s + '</svg>';
  }

  // Scatter. points: [{x, y, title}], o: {xmin,xmax,ymin,ymax,xlabel,ylabel,vline,hline}
  function scatter(el, points, o) {
    var W = widthOf(el), H = o.height || 260, top = 12, bottom = 40, left = 46, right = 12;
    function x(v) { return left + (v - o.xmin) / (o.xmax - o.xmin) * (W - left - right); }
    function y(v) { return top + (1 - (v - o.ymin) / (o.ymax - o.ymin)) * (H - top - bottom); }
    var s = svgOpen(W, H, o.label);
    ticks(o.xmin, o.xmax, 5).forEach(function (t) {
      if (t < o.xmin || t > o.xmax) return;
      s += '<line class="grid" x1="' + x(t) + '" x2="' + x(t) + '" y1="' + top + '" y2="' + (H - bottom) + '"/><text class="tick" x="' + x(t) + '" y="' + (H - bottom + 15) + '" text-anchor="middle">' + t + '</text>';
    });
    ticks(o.ymin, o.ymax, 4).forEach(function (t) {
      if (t < o.ymin || t > o.ymax) return;
      s += '<line class="grid" x1="' + left + '" x2="' + (W - right) + '" y1="' + y(t) + '" y2="' + y(t) + '"/><text class="tick" x="' + (left - 6) + '" y="' + (y(t) + 4) + '" text-anchor="end">' + t + '</text>';
    });
    if (o.vline != null) s += '<line class="thr" x1="' + x(o.vline) + '" x2="' + x(o.vline) + '" y1="' + top + '" y2="' + (H - bottom) + '"/>';
    if (o.hline != null) s += '<line class="thr" x1="' + left + '" x2="' + (W - right) + '" y1="' + y(o.hline) + '" y2="' + y(o.hline) + '"/>';
    points.forEach(function (p) {
      s += '<circle class="pt" cx="' + x(p.x).toFixed(1) + '" cy="' + y(p.y).toFixed(1) + '" r="2.6"><title>' + esc(p.title || '') + '</title></circle>';
    });
    s += '<text class="tick" x="' + ((left + W - right) / 2) + '" y="' + (H - 6) + '" text-anchor="middle">' + esc(o.xlabel || '') + '</text>';
    s += '<text class="tick" transform="translate(12,' + ((top + H - bottom) / 2) + ') rotate(-90)" text-anchor="middle">' + esc(o.ylabel || '') + '</text>';
    el.innerHTML = s + '</svg>';
  }

  // Tiny trend line for table cells. Returns markup.
  function spark(values, w, h) {
    w = w || 84; h = h || 22;
    var v = values.filter(function (x) { return x != null; });
    if (v.length < 2) return '';
    var lo = Math.min.apply(null, v), hi = Math.max.apply(null, v), rng = hi - lo || 1;
    var pts = v.map(function (val, i) { return [2 + i / (v.length - 1) * (w - 6), 2 + (1 - (val - lo) / rng) * (h - 4)]; });
    var last = pts[pts.length - 1];
    return '<svg class="spark" viewBox="0 0 ' + w + ' ' + h + '" width="' + w + '" height="' + h + '" aria-hidden="true"><polyline points="' +
      pts.map(function (p) { return p[0].toFixed(1) + ',' + p[1].toFixed(1); }).join(' ') + '"/><circle cx="' + last[0] + '" cy="' + last[1] + '" r="2.4"/></svg>';
  }

  function bindPick(el, fn) {
    if (!fn) return;
    el.querySelectorAll('.pick').forEach(function (g) {
      g.addEventListener('click', function () { fn(g.getAttribute('data-key')); });
      g.addEventListener('keydown', function (e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); fn(g.getAttribute('data-key')); } });
    });
  }

  root.Charts = { hbar: hbar, vbar: vbar, line: line, scatter: scatter, spark: spark, esc: esc };
})(this);
