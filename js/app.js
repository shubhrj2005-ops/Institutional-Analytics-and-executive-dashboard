/*
 * Institutional Analytics & Executive Dashboard
 * B.Tech CSE major project, IILM University, Greater Noida
 *
 * Architecture:
 *   DATA        six datasets (students, results, faculty, admissions, placements, attendance_history)
 *   SETTINGS    editable thresholds (min attendance, pass mark, warning bands) saved in localStorage
 *   UPLOAD LOG  audit trail of data uploads saved in localStorage
 *   ROLES       Admin Console, Executive View (Director), HOD Department, Student Portal
 *   VIEWS       per-role page controllers registered into App.VIEWS
 */
(function (root) {
  'use strict';

  var esc = Charts.esc;

  // ------------------------------------------------------------------ dataset specifications
  var SPEC = {
    students: {
      label: 'Students', hint: 'One row per enrolled student, for the current term.',
      cols: ['student_id', 'name', 'department', 'program', 'year', 'semester', 'gender', 'admission_year', 'attendance_pct', 'avg_marks', 'result', 'placement_status', 'company', 'package_lpa'],
      required: ['student_id', 'department', 'semester', 'attendance_pct'],
      num: ['year', 'semester', 'admission_year', 'attendance_pct', 'avg_marks', 'package_lpa']
    },
    results: {
      label: 'Exam results', hint: 'One row per student per subject, for the last completed semester.',
      cols: ['student_id', 'department', 'semester', 'subject_code', 'subject', 'marks'],
      required: ['student_id', 'department', 'subject', 'marks'],
      num: ['semester', 'marks']
    },
    faculty: {
      label: 'Faculty', hint: 'One row per teaching staff member.',
      cols: ['faculty_id', 'name', 'department', 'designation', 'qualification', 'experience_years'],
      required: ['faculty_id', 'department', 'designation'],
      num: ['experience_years']
    },
    admissions: {
      label: 'Admissions', hint: 'One row per department per year.',
      cols: ['year', 'department', 'applications', 'admitted'],
      required: ['year', 'department', 'admitted'],
      num: ['year', 'applications', 'admitted']
    },
    placements: {
      label: 'Placements', hint: 'One row per department per passing-out batch.',
      cols: ['batch', 'department', 'eligible', 'placed', 'avg_package_lpa', 'highest_package_lpa'],
      required: ['batch', 'department', 'eligible', 'placed'],
      num: ['batch', 'eligible', 'placed', 'avg_package_lpa', 'highest_package_lpa']
    },
    attendance_history: {
      label: 'Attendance history', hint: 'Average attendance per department per term, oldest first.',
      cols: ['term', 'department', 'attendance_pct'],
      required: ['term', 'department', 'attendance_pct'],
      num: ['attendance_pct']
    }
  };
  var DS_KEYS = Object.keys(SPEC);

  var STORE_KEY = 'iaed.uploads.v1';
  var SESSION_KEY = 'iaed.session.v1';
  var THEME_KEY = 'iaed.theme.v1';
  var SETTINGS_KEY = 'iaed.settings.v1';
  var UPLOAD_LOG_KEY = 'iaed.upload_log.v1';

  var DEFAULT_SETTINGS = {
    minAttendance: 75,
    passMark: 40,
    bands: {
      att: [75, 80],
      pass: [75, 85],
      place: [55, 70],
      marks: [55, 62]
    }
  };

  var DATA = {}, SOURCE = {};

  // ------------------------------------------------------------------ storage helpers
  function local() { try { return window.localStorage; } catch (e) { return null; } }
  function sess() { try { return window.sessionStorage; } catch (e) { return null; } }
  function storageGet(store, key) { try { var v = store.getItem(key); return v ? JSON.parse(v) : null; } catch (e) { return null; } }
  function storageSet(store, key, val) { try { store.setItem(key, JSON.stringify(val)); return true; } catch (e) { return false; } }
  function storageDel(store, key) { try { store.removeItem(key); } catch (e) { /* ignore */ } }

  // ------------------------------------------------------------------ settings management
  function getSettings() {
    var ls = local();
    var saved = ls ? storageGet(ls, SETTINGS_KEY) : null;
    if (!saved) return DEFAULT_SETTINGS;
    return {
      minAttendance: typeof saved.minAttendance === 'number' ? saved.minAttendance : DEFAULT_SETTINGS.minAttendance,
      passMark: typeof saved.passMark === 'number' ? saved.passMark : DEFAULT_SETTINGS.passMark,
      bands: {
        att: (saved.bands && saved.bands.att) || DEFAULT_SETTINGS.bands.att,
        pass: (saved.bands && saved.bands.pass) || DEFAULT_SETTINGS.bands.pass,
        place: (saved.bands && saved.bands.place) || DEFAULT_SETTINGS.bands.place,
        marks: (saved.bands && saved.bands.marks) || DEFAULT_SETTINGS.bands.marks
      }
    };
  }

  function saveSettings(val) {
    var ls = local();
    if (!ls) return false;
    if (!val) {
      storageDel(ls, SETTINGS_KEY);
      render();
      return true;
    }
    var ok = storageSet(ls, SETTINGS_KEY, val);
    render();
    return ok;
  }

  function getMinAttendance() { return getSettings().minAttendance; }
  function getPassMark() { return getSettings().passMark; }
  function getBands() { return getSettings().bands; }

  // ------------------------------------------------------------------ upload log management
  function getUploadLog() {
    var ls = local();
    var list = ls ? storageGet(ls, UPLOAD_LOG_KEY) : null;
    return Array.isArray(list) ? list : [];
  }

  function addUploadLog(entry) {
    var ls = local();
    if (!ls) return;
    var list = getUploadLog();
    list.unshift(entry);
    if (list.length > 50) list = list.slice(0, 50);
    storageSet(ls, UPLOAD_LOG_KEY, list);
  }

  function clearUploadLog() {
    var ls = local();
    if (ls) storageDel(ls, UPLOAD_LOG_KEY);
  }

  // ------------------------------------------------------------------ sample data & uploads
  function loadSample(keys) {
    var sample = SampleData.generate();
    (keys || DS_KEYS).forEach(function (k) {
      DATA[k] = sample[k];
      SOURCE[k] = { type: 'sample' };
    });
  }

  function saveUploads() {
    var ls = local(); if (!ls) return false;
    var out = { data: {}, source: {} };
    DS_KEYS.forEach(function (k) { if (SOURCE[k] && SOURCE[k].type === 'upload') { out.data[k] = DATA[k]; out.source[k] = SOURCE[k]; } });
    if (!Object.keys(out.data).length) { storageDel(ls, STORE_KEY); return true; }
    return storageSet(ls, STORE_KEY, out);
  }

  loadSample();
  (function restoreUploads() {
    var ls = local(); if (!ls) return;
    var saved = storageGet(ls, STORE_KEY);
    if (!saved || !saved.data) return;
    Object.keys(saved.data).forEach(function (k) {
      if (SPEC[k] && Array.isArray(saved.data[k])) { DATA[k] = saved.data[k]; SOURCE[k] = saved.source[k] || { type: 'upload' }; }
    });
  })();

  // ------------------------------------------------------------------ theme management
  function getPreferredTheme() {
    var ls = local();
    var saved = ls ? storageGet(ls, THEME_KEY) : null;
    if (saved === 'dark' || saved === 'light') return saved;
    if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) return 'dark';
    return 'light';
  }

  function applyTheme(t) {
    if (t !== 'dark' && t !== 'light') t = 'light';
    document.documentElement.setAttribute('data-theme', t);
    var ls = local();
    if (ls) storageSet(ls, THEME_KEY, t);
    updateThemeButtons();
  }

  function themeSwitchHtml(cls) {
    var cur = document.documentElement.getAttribute('data-theme') || getPreferredTheme();
    return '<div class="theme-switch' + (cls ? ' ' + cls : '') + '" role="group" aria-label="Color theme switch">' +
      '<button type="button" class="theme-btn' + (cur === 'light' ? ' active' : '') + '" data-set-theme="light" title="Switch to light mode" aria-pressed="' + (cur === 'light') + '">' +
        '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">' +
          '<circle cx="12" cy="12" r="5"></circle>' +
          '<line x1="12" y1="1" x2="12" y2="3"></line><line x1="12" y1="21" x2="12" y2="23"></line>' +
          '<line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line>' +
          '<line x1="1" y1="12" x2="3" y2="12"></line><line x1="21" y1="12" x2="23" y2="12"></line>' +
          '<line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line>' +
        '</svg><span>Light</span>' +
      '</button>' +
      '<button type="button" class="theme-btn' + (cur === 'dark' ? ' active' : '') + '" data-set-theme="dark" title="Switch to dark mode" aria-pressed="' + (cur === 'dark') + '">' +
        '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">' +
          '<path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path>' +
        '</svg><span>Dark</span>' +
      '</button>' +
    '</div>';
  }

  function bindThemeEvents(container) {
    var rootEl = container || document;
    rootEl.querySelectorAll('[data-set-theme]').forEach(function (btn) {
      btn.addEventListener('click', function (e) {
        e.preventDefault();
        var t = btn.getAttribute('data-set-theme');
        applyTheme(t);
      });
    });
  }

  function updateThemeButtons() {
    var cur = document.documentElement.getAttribute('data-theme') || getPreferredTheme();
    document.querySelectorAll('[data-set-theme]').forEach(function (btn) {
      var isCur = btn.getAttribute('data-set-theme') === cur;
      if (isCur) {
        btn.classList.add('active');
        btn.setAttribute('aria-pressed', 'true');
      } else {
        btn.classList.remove('active');
        btn.setAttribute('aria-pressed', 'false');
      }
    });
  }

  applyTheme(getPreferredTheme());

  if (window.matchMedia) {
    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', function (e) {
      var ls = local();
      if (!ls || !storageGet(ls, THEME_KEY)) {
        applyTheme(e.matches ? 'dark' : 'light');
      }
    });
  }

  // ------------------------------------------------------------------ helpers
  function isNum(v) { return typeof v === 'number' && !isNaN(v); }
  function sum(a) { return a.reduce(function (s, v) { return s + (isNum(v) ? v : 0); }, 0); }
  function mean(a) { var v = a.filter(isNum); return v.length ? sum(v) / v.length : null; }
  function uniq(a) { return a.filter(function (v, i) { return a.indexOf(v) === i; }); }
  function n0(v) { return isNum(v) ? Math.round(v).toLocaleString('en-IN') : '–'; }
  function n1(v) { return isNum(v) ? (Math.round(v * 10) / 10).toLocaleString('en-IN', { minimumFractionDigits: 1, maximumFractionDigits: 1 }) : '–'; }
  function pct(v) { return isNum(v) ? n1(v) + '%' : '–'; }
  function lpa(v) { return isNum(v) ? '₹' + n1(v) + ' LPA' : '–'; }
  function by(key, dir) { return function (a, b) { var x = a[key], y = b[key]; if (x === y) return 0; if (x == null || x === '') return 1; if (y == null || y === '') return -1; return (x > y ? 1 : -1) * (dir || 1); }; }

  function status(kind, v) {
    var bands = getBands();
    var b = bands[kind];
    if (!b || !isNum(v)) return '';
    return v < b[0] ? 'bad' : v < b[1] ? 'warn' : 'good';
  }

  function deptName(code) { return SampleData.DEPT_NAMES[code] || code; }
  function allDepts() {
    var seen = [];
    DS_KEYS.forEach(function (k) { (DATA[k] || []).forEach(function (r) { if (r.department && seen.indexOf(r.department) < 0) seen.push(r.department); }); });
    var order = SampleData.DEPT_ORDER;
    return seen.sort(function (a, b) {
      var ia = order.indexOf(a), ib = order.indexOf(b);
      if (ia < 0 && ib < 0) return a < b ? -1 : 1;
      if (ia < 0) return 1; if (ib < 0) return -1; return ia - ib;
    });
  }

  // ------------------------------------------------------------------ state
  var S = {
    user: null, dept: 'ALL', view: 'executive_summary',
    admYear: null, batch: null,
    st: { q: '', sem: '', band: '', result: '', sort: 'name', dir: 1, page: 0 },
    sub: { q: '', sort: 'pass', dir: 1, page: 0 },
    fac: { q: '', sort: 'name', dir: 1 },
    msgs: {}
  };

  function visibleDepts() { return S.user && S.user.role === 'hod' ? [S.user.dept] : allDepts(); }
  function currentDept() { return S.user && S.user.role === 'hod' ? S.user.dept : S.dept; }
  function inDept(rows, dept) { dept = dept || currentDept(); return dept === 'ALL' ? (rows || []) : (rows || []).filter(function (r) { return r.department === dept; }); }
  function scopeLabel() { var d = currentDept(); return d === 'ALL' ? 'all departments' : d; }

  // ------------------------------------------------------------------ metrics
  function latest(rows, key) { return rows && rows.length ? Math.max.apply(null, rows.map(function (r) { return r[key]; }).filter(isNum)) : null; }
  function termSort(a, b) {
    function k(t) { var m = /(odd|even)\s*(\d{4})/i.exec(t || ''); return m ? +m[2] * 2 + (m[1].toLowerCase() === 'odd' ? 1 : 0) : 0; }
    return k(a) - k(b);
  }

  function metrics(dept) {
    var minAtt = getMinAttendance();
    var st = inDept(DATA.students, dept), fa = inDept(DATA.faculty, dept);
    var withRes = st.filter(function (s) { return s.result === 'Pass' || s.result === 'Backlog'; });
    var passed = withRes.filter(function (s) { return s.result === 'Pass'; }).length;
    var m = {
      students: st.length, faculty: fa.length,
      ratio: fa.length ? st.length / fa.length : null,
      att: mean(st.map(function (s) { return s.attendance_pct; })),
      shortage: st.filter(function (s) { return isNum(s.attendance_pct) && s.attendance_pct < minAtt; }).length,
      pass: withRes.length ? passed / withRes.length * 100 : null,
      backlog: withRes.length - passed,
      marks: mean(withRes.map(function (s) { return s.avg_marks; })),
      female: st.length ? st.filter(function (s) { return s.gender === 'F'; }).length / st.length * 100 : null
    };
    var pl = inDept(DATA.placements, dept);
    m.batch = latest(pl, 'batch');
    var plB = pl.filter(function (r) { return r.batch === m.batch; });
    var el = sum(plB.map(function (r) { return r.eligible; })), pd = sum(plB.map(function (r) { return r.placed; }));
    m.placePct = el ? pd / el * 100 : null;
    m.avgPkg = pd ? sum(plB.map(function (r) { return (r.avg_package_lpa || 0) * r.placed; })) / pd : null;
    var ad = inDept(DATA.admissions, dept);
    m.admYear = latest(ad, 'year');
    m.admLatest = sum(ad.filter(function (r) { return r.year === m.admYear; }).map(function (r) { return r.admitted; }));
    m.admPrev = sum(ad.filter(function (r) { return r.year === m.admYear - 1; }).map(function (r) { return r.admitted; }));
    m.admChange = m.admPrev ? (m.admLatest - m.admPrev) / m.admPrev * 100 : null;
    return m;
  }

  function subjectStats(dept) {
    var passMark = getPassMark();
    var g = {};
    inDept(DATA.results, dept).forEach(function (r) {
      var k = r.department + '|' + (r.subject_code || r.subject);
      var o = g[k] || (g[k] = { code: r.subject_code || '', subject: r.subject, department: r.department, semester: r.semester, n: 0, total: 0, passed: 0 });
      if (!isNum(r.marks)) return;
      o.n++; o.total += r.marks; if (r.marks >= passMark) o.passed++;
    });
    return Object.keys(g).map(function (k) { var o = g[k]; o.avg = o.n ? o.total / o.n : null; o.pass = o.n ? o.passed / o.n * 100 : null; return o; }).filter(function (o) { return o.n; });
  }

  function attentionItems(dept) {
    var out = [];
    var minAtt = getMinAttendance();
    var bands = getBands();
    var depts = dept === 'ALL' ? visibleDepts() : [dept];
    depts.forEach(function (d) {
      var m = metrics(d);
      if (isNum(m.att) && m.att < minAtt) out.push({ lvl: 'bad', w: 3, text: d + ' average attendance is ' + pct(m.att) + ' this term, below the ' + minAtt + '% minimum.' });
      if (isNum(m.pass) && m.pass < bands.pass[0]) out.push({ lvl: 'bad', w: 3, text: 'Only ' + pct(m.pass) + ' of ' + d + ' students cleared every subject last semester.' });
      if (isNum(m.placePct) && m.placePct < bands.place[0]) out.push({ lvl: 'warn', w: 2, text: d + ' placed ' + pct(m.placePct) + ' of eligible students in batch ' + m.batch + '.' });
      if (isNum(m.admChange) && m.admChange <= -5) out.push({ lvl: 'warn', w: 2, text: d + ' admissions fell ' + n1(-m.admChange) + '% from ' + (m.admYear - 1) + ' to ' + m.admYear + '.' });
    });
    subjectStats(dept).filter(function (s) { return s.pass < bands.pass[0]; }).sort(by('pass')).slice(0, 3).forEach(function (s) {
      out.push({ lvl: s.pass < bands.pass[0] - 5 ? 'bad' : 'warn', w: 1, text: s.subject + ' (' + s.department + ', sem ' + s.semester + '): ' + pct(s.pass) + ' passed.' });
    });
    var m = metrics(dept);
    if (m.shortage) out.push({ lvl: 'warn', w: 1, text: n0(m.shortage) + ' students in ' + scopeLabel() + ' are below ' + minAtt + '% attendance and may be stopped from sitting exams.' });
    out.sort(function (a, b) { return (a.lvl === b.lvl ? 0 : a.lvl === 'bad' ? -1 : 1) || b.w - a.w; });
    return out.slice(0, 8);
  }

  // ------------------------------------------------------------------ UI building blocks
  function kpis(items) {
    return '<div class="kpis">' + items.map(function (k) {
      return '<div class="kpi ' + (k.cls || '') + '"><span>' + esc(k.label) + '</span><b>' + esc(k.value) + '</b>' +
        (k.note ? '<small class="' + (k.noteCls || '') + '">' + esc(k.note) + '</small>' : '') + '</div>';
    }).join('') + '</div>';
  }

  function panel(id, title, sub, extra, cls) {
    return '<section class="panel ' + (cls || '') + '"><div class="panel-h"><h2>' + esc(title) + '</h2>' + (sub ? '<p>' + esc(sub) + '</p>' : '') + '</div>' +
      '<div class="chart" id="' + id + '"></div>' + (extra || '') + '</section>';
  }

  function changeNote(v, prevLabel) {
    if (!isNum(v)) return { note: '', cls: '' };
    var up = v >= 0;
    return { note: (up ? '+' : '−') + n1(Math.abs(v)) + '% vs ' + prevLabel, cls: up ? 'up' : 'down' };
  }

  function sortHead(key, label, state, right) {
    var aria = state.sort === key ? (state.dir === 1 ? 'ascending' : 'descending') : 'none';
    return '<th' + (right ? ' class="r"' : '') + ' scope="col"><button type="button" data-sort="' + key + '" aria-sort="' + aria + '">' + esc(label) + '</button></th>';
  }

  function bindSort(container, state, rerender) {
    container.querySelectorAll('[data-sort]').forEach(function (b) {
      b.addEventListener('click', function () {
        var k = b.getAttribute('data-sort');
        if (state.sort === k) state.dir = -state.dir; else { state.sort = k; state.dir = 1; }
        if (state.page != null) state.page = 0;
        rerender();
      });
    });
  }

  function pickDept(code) {
    if (S.user && S.user.role === 'hod') return;
    S.dept = S.dept === code ? 'ALL' : code;
    render();
  }

  function deptItems(fn, kind) {
    return visibleDepts().map(function (d) {
      var v = fn(d);
      var cls = currentDept() !== 'ALL' && currentDept() !== d ? 'muted' : (kind ? status(kind, v) : '');
      return { label: d, value: v, key: d, cls: cls, title: deptName(d) + ': ' + (kind === 'ratio' ? n1(v) : isNum(v) ? (Math.round(v * 10) / 10) : v) };
    });
  }

  function empty(msg) { return '<p class="muted">' + esc(msg) + '</p>'; }

  function pager(page, pages, total, noun) {
    if (pages <= 1) return '<div class="pager"><span>' + n0(total) + ' ' + noun + '</span></div>';
    return '<div class="pager"><span>' + n0(total) + ' ' + noun + ', page ' + (page + 1) + ' of ' + pages + '</span><div>' +
      '<button type="button" class="btn ghost small" data-page="-1"' + (page === 0 ? ' disabled' : '') + '>Previous</button>' +
      '<button type="button" class="btn ghost small" data-page="1"' + (page >= pages - 1 ? ' disabled' : '') + '>Next</button></div></div>';
  }

  function bindPager(box, state, rerender) {
    box.querySelectorAll('[data-page]').forEach(function (b) {
      b.addEventListener('click', function () { state.page += +b.getAttribute('data-page'); rerender(); });
    });
  }

  function drawAttendanceTrend(el, dept) {
    var ah = DATA.attendance_history || [];
    var minAtt = getMinAttendance();
    if (!ah.length) { el.innerHTML = empty('No attendance history loaded.'); return; }
    var terms = uniq(ah.map(function (r) { return r.term; })).sort(termSort);
    function avgFor(rows) { return terms.map(function (t) { var v = mean(rows.filter(function (r) { return r.term === t; }).map(function (r) { return r.attendance_pct; })); return v == null ? null : Math.round(v * 10) / 10; }); }
    var inst = avgFor(inDept(ah, 'ALL').filter(function (r) { return visibleDepts().indexOf(r.department) >= 0 || (S.user && S.user.role !== 'hod'); }));
    var series = dept === 'ALL' ? [{ name: 'Institute', values: inst }] : [{ name: 'Institute', values: avgFor(ah), cls: 'alt', noLabel: true }, { name: dept, values: avgFor(inDept(ah, dept)) }];
    Charts.line(el, { labels: terms, series: series }, { fmt: function (v) { return v + '%'; }, threshold: { value: minAtt, label: minAtt + '% minimum' }, label: 'Attendance by term' });
  }

  // ------------------------------------------------------------------ core views
  var VIEWS = {};

  VIEWS.academics = {
    title: 'Academics',
    sub: function () { return 'Exam results from the last completed semester, ' + scopeLabel() + '. Pass mark is ' + getPassMark() + '.'; },
    html: function () {
      var m = metrics(currentDept());
      var weak = subjectStats(currentDept()).filter(function (s) { return s.pass < 75; }).length;
      var html = kpis([
        { label: 'Pass rate', value: pct(m.pass), note: 'Students with no backlog', cls: status('pass', m.pass) },
        { label: 'Average marks', value: n1(m.marks), note: 'Out of 100', cls: status('marks', m.marks) },
        { label: 'Students with backlogs', value: n0(m.backlog), note: 'Failed at least one subject', cls: m.backlog ? 'warn' : 'good' },
        { label: 'Subjects under 75% pass', value: n0(weak), note: 'Need a closer look', cls: weak ? 'bad' : 'good' }
      ]);
      html += '<div class="grid2">' +
        panel('ac-pass', 'Pass rate by department', 'Students who cleared every subject') +
        panel('ac-dist', 'How marks are spread', 'Every subject paper, grouped by marks') + '</div>';
      html += '<div class="grid2">' +
        panel('ac-scatter', 'Attendance against marks', 'One dot per student', '<p class="note" id="ac-scatter-note"></p>') +
        panel('ac-sem', 'Pass rate by semester', 'Share of subject papers passed') + '</div>';
      html += '<section class="panel"><div class="panel-h"><h2>Subject performance</h2><p>Lowest pass rate first</p></div>' +
        '<div class="tools"><input type="search" id="sub-q" placeholder="Search subject or code" aria-label="Search subjects" value="' + esc(S.sub.q) + '"></div><div class="tbl" id="ac-subjects"></div></section>';
      return html;
    },
    after: function () {
      var dept = currentDept();
      var passMark = getPassMark();
      var minAtt = getMinAttendance();
      var bands = getBands();

      Charts.hbar(byId('ac-pass'), deptItems(function (d) { return metrics(d).pass; }, 'pass'), { max: 100, fmt: function (v) { return Math.round(v) + '%'; }, threshold: bands.pass[0], onPick: pickDept, label: 'Pass rate by department' });

      var res = inDept(DATA.results, dept);
      var bins = [['0–39', 0, 39], ['40–49', 40, 49], ['50–59', 50, 59], ['60–69', 60, 69], ['70–79', 70, 79], ['80–89', 80, 89], ['90–100', 90, 100]];
      var counts = bins.map(function (b) { return res.filter(function (r) { return r.marks >= b[1] && r.marks <= b[2]; }).length; });
      if (res.length) Charts.vbar(byId('ac-dist'), { labels: bins.map(function (b) { return b[0]; }), series: [{ values: counts, clsEach: counts.map(function (c, i) { return i === 0 ? 'bad' : ''; }) }] }, { label: 'Marks distribution' });
      else byId('ac-dist').innerHTML = empty('No exam results loaded.');

      var st = inDept(DATA.students, dept).filter(function (s) { return isNum(s.attendance_pct) && isNum(s.avg_marks); });
      var sample = st.length > 900 ? st.filter(function (s, i) { return i % Math.ceil(st.length / 900) === 0; }) : st;
      Charts.scatter(byId('ac-scatter'), sample.map(function (s) { return { x: s.attendance_pct, y: s.avg_marks, title: s.name + ': ' + s.attendance_pct + '% attendance, ' + s.avg_marks + ' marks' }; }),
        { xmin: 30, xmax: 100, ymin: 20, ymax: 100, vline: minAtt, xlabel: 'Attendance %', ylabel: 'Average marks', label: 'Attendance against marks' });
      var hi = mean(st.filter(function (s) { return s.attendance_pct >= minAtt; }).map(function (s) { return s.avg_marks; }));
      var lo = mean(st.filter(function (s) { return s.attendance_pct < minAtt; }).map(function (s) { return s.avg_marks; }));
      byId('ac-scatter-note').textContent = isNum(hi) && isNum(lo) ? 'Students at or above ' + minAtt + '% attendance average ' + n1(hi) + ' marks. Those below average ' + n1(lo) + '.' : '';

      var sems = uniq(res.map(function (r) { return r.semester; })).filter(isNum).sort(function (a, b) { return a - b; });
      var sp = sems.map(function (s) { var rr = res.filter(function (r) { return r.semester === s; }); return rr.filter(function (r) { return r.marks >= passMark; }).length / rr.length * 100; });
      if (sems.length) Charts.vbar(byId('ac-sem'), { labels: sems.map(function (s) { return 'Sem ' + s; }), series: [{ values: sp.map(function (v) { return Math.round(v * 10) / 10; }), clsEach: sp.map(function (v) { return status('pass', v) === 'bad' ? 'bad' : ''; }) }] }, { fmt: function (v) { return Math.round(v) + '%'; }, label: 'Pass rate by semester' });
      else byId('ac-sem').innerHTML = empty('No exam results loaded.');

      drawAcademicsSubjects();
      byId('sub-q').addEventListener('input', function (e) { S.sub.q = e.target.value; S.sub.page = 0; drawAcademicsSubjects(); });
    }
  };

  function drawAcademicsSubjects() {
    var q = S.sub.q.trim().toLowerCase();
    var rows = subjectStats(currentDept()).filter(function (s) { return !q || (s.subject + ' ' + s.code).toLowerCase().indexOf(q) >= 0; });
    rows.sort(by(S.sub.sort, S.sub.dir));
    var per = 12, pages = Math.max(1, Math.ceil(rows.length / per));
    S.sub.page = Math.min(S.sub.page, pages - 1);
    var page = rows.slice(S.sub.page * per, S.sub.page * per + per);
    var t = '<table class="data"><thead><tr>' + sortHead('subject', 'Subject', S.sub) + sortHead('code', 'Code', S.sub) + sortHead('department', 'Dept', S.sub) +
      sortHead('semester', 'Sem', S.sub, true) + sortHead('n', 'Students', S.sub, true) + sortHead('avg', 'Avg marks', S.sub, true) + sortHead('pass', 'Pass rate', S.sub, true) + '</tr></thead><tbody>';
    page.forEach(function (s) {
      t += '<tr><td>' + esc(s.subject) + '</td><td class="muted">' + esc(s.code) + '</td><td>' + esc(s.department) + '</td><td class="r">' + esc(s.semester) + '</td><td class="r">' + n0(s.n) + '</td><td class="r">' + n1(s.avg) + '</td><td class="r"><span class="chip ' + status('pass', s.pass) + '">' + pct(s.pass) + '</span></td></tr>';
    });
    if (!page.length) t += '<tr><td colspan="7" class="muted">No subjects match.</td></tr>';
    var box = byId('ac-subjects');
    box.innerHTML = t + '</tbody></table>' + pager(S.sub.page, pages, rows.length, 'subjects');
    bindSort(box, S.sub, drawAcademicsSubjects);
    bindPager(box, S.sub, drawAcademicsSubjects);
  }

  VIEWS.admissions = {
    title: 'Admissions',
    sub: function () { return 'Applications and admissions by year, ' + scopeLabel() + '.'; },
    html: function () {
      var ad = inDept(DATA.admissions), years = uniq(ad.map(function (r) { return r.year; })).filter(isNum).sort();
      if (!years.length) return empty('No admissions data loaded.');
      if (years.indexOf(S.admYear) < 0) S.admYear = years[years.length - 1];
      var y = S.admYear;
      function tot(yr, k) { return sum(ad.filter(function (r) { return r.year === yr; }).map(function (r) { return r[k]; })); }
      var adm = tot(y, 'admitted'), apps = tot(y, 'applications'), prev = tot(y - 1, 'admitted');
      var ch = changeNote(prev ? (adm - prev) / prev * 100 : null, y - 1);
      var html = '<div class="tools"><label for="adm-year" class="muted" style="align-self:center">Year</label><select id="adm-year">' +
        years.slice().reverse().map(function (yr) { return '<option' + (yr === y ? ' selected' : '') + '>' + yr + '</option>'; }).join('') + '</select></div>';
      html += kpis([
        { label: 'Admitted in ' + y, value: n0(adm), note: ch.note, noteCls: ch.cls },
        { label: 'Applications', value: apps ? n0(apps) : '–' },
        { label: 'Applicants per seat', value: apps && adm ? n1(apps / adm) : '–', note: 'Higher means more competition' },
        { label: 'Change since ' + years[0], value: tot(years[0], 'admitted') ? (adm >= tot(years[0], 'admitted') ? '+' : '−') + n1(Math.abs(adm - tot(years[0], 'admitted')) / tot(years[0], 'admitted') * 100) + '%' : '–' }
      ]);
      html += '<div class="grid2">' +
        panel('ad-trend', 'Applications and admissions', 'By year', '<div class="legend"><span><i class="muted"></i>Applications</span><span><i></i>Admitted</span></div>') +
        panel('ad-dept', 'Admitted by department', 'In ' + y) + '</div>';
      html += '<section class="panel"><div class="panel-h"><h2>Year-wise admissions</h2><p>Last column compares ' + y + ' with the year before</p></div><div class="tbl" id="ad-table"></div></section>';
      return html;
    },
    after: function () {
      var sel = byId('adm-year');
      if (!sel) return;
      sel.addEventListener('change', function (e) { S.admYear = +e.target.value; render(); });
      var ad = inDept(DATA.admissions), years = uniq(ad.map(function (r) { return r.year; })).filter(isNum).sort();
      function tot(rows, yr, k) { return sum(rows.filter(function (r) { return r.year === yr; }).map(function (r) { return r[k]; })); }
      Charts.vbar(byId('ad-trend'), { labels: years.map(String), series: [
        { name: 'Applications', values: years.map(function (y) { return tot(ad, y, 'applications'); }), cls: 'muted' },
        { name: 'Admitted', values: years.map(function (y) { return tot(ad, y, 'admitted'); }) }] }, { fmt: n0, label: 'Applications and admissions by year' });
      Charts.hbar(byId('ad-dept'), deptItems(function (d) { return tot(inDept(DATA.admissions, d), S.admYear, 'admitted'); }), { onPick: pickDept, fmt: n0, label: 'Admitted by department' });
      var t = '<table class="data"><thead><tr><th scope="col">Department</th>' + years.map(function (y) { return '<th class="r" scope="col">' + y + '</th>'; }).join('') + '<th class="r" scope="col">Change</th></tr></thead><tbody>';
      visibleDepts().filter(function (d) { return currentDept() === 'ALL' || d === currentDept(); }).forEach(function (d) {
        var rows = inDept(DATA.admissions, d), cur = tot(rows, S.admYear, 'admitted'), prev = tot(rows, S.admYear - 1, 'admitted');
        var ch = prev ? (cur - prev) / prev * 100 : null;
        t += '<tr><td><b>' + esc(d) + '</b></td>' + years.map(function (y) { return '<td class="r' + (y === S.admYear ? '" style="font-weight:700' : '') + '">' + n0(tot(rows, y, 'admitted')) + '</td>'; }).join('') +
          '<td class="r">' + (isNum(ch) ? '<span class="chip ' + (ch <= -5 ? 'bad' : ch < 0 ? 'warn' : 'good') + '">' + (ch >= 0 ? '+' : '−') + n1(Math.abs(ch)) + '%</span>' : '–') + '</td></tr>';
      });
      byId('ad-table').innerHTML = t + '</tbody></table>';
    }
  };

  VIEWS.placements = {
    title: 'Placements',
    sub: function () { return 'Placement outcomes by passing-out batch, ' + scopeLabel() + '.'; },
    html: function () {
      var pl = inDept(DATA.placements), batches = uniq(pl.map(function (r) { return r.batch; })).filter(isNum).sort();
      var html = '';
      if (batches.length) {
        if (batches.indexOf(S.batch) < 0) S.batch = batches[batches.length - 1];
        var rows = pl.filter(function (r) { return r.batch === S.batch; });
        var el = sum(rows.map(function (r) { return r.eligible; })), pd = sum(rows.map(function (r) { return r.placed; }));
        var avg = pd ? sum(rows.map(function (r) { return (r.avg_package_lpa || 0) * r.placed; })) / pd : null;
        var high = Math.max.apply(null, rows.map(function (r) { return r.highest_package_lpa; }).filter(isNum).concat([0]));
        html += '<div class="tools"><label for="pl-batch" class="muted" style="align-self:center">Batch</label><select id="pl-batch">' +
          batches.slice().reverse().map(function (b) { return '<option' + (b === S.batch ? ' selected' : '') + '>' + b + '</option>'; }).join('') + '</select></div>';
        html += kpis([
          { label: 'Eligible students', value: n0(el), note: 'Batch ' + S.batch },
          { label: 'Placed', value: n0(pd) },
          { label: 'Placement rate', value: pct(el ? pd / el * 100 : null), cls: status('place', el ? pd / el * 100 : null) },
          { label: 'Average package', value: lpa(avg) },
          { label: 'Highest package', value: lpa(high || null) }
        ]);
        html += '<div class="grid2">' +
          panel('pl-trend', 'Placement rate by batch', 'Placed out of eligible') +
          panel('pl-dept', 'Placement rate by department', 'Batch ' + S.batch) + '</div>';
        html += '<div class="grid2">' + panel('pl-pkg', 'Average package by department', 'Batch ' + S.batch + ', lakh per annum') +
          '<section class="panel"><div class="panel-h"><h2>Current final-year batch</h2><p>Season in progress, from student records</p></div><div class="chart" id="pl-now"></div></section></div>';
      } else html += empty('No placement history loaded.');
      html += '<section class="panel"><div class="panel-h"><h2>Recruiters this season</h2><p>Offers made to current final-year students</p></div><div class="tbl" id="pl-rec"></div></section>';
      return html;
    },
    after: function () {
      var sel = byId('pl-batch');
      if (sel) {
        sel.addEventListener('change', function (e) { S.batch = +e.target.value; render(); });
        var pl = inDept(DATA.placements), batches = uniq(pl.map(function (r) { return r.batch; })).filter(isNum).sort();
        function rate(rows) { var e = sum(rows.map(function (r) { return r.eligible; })); return e ? sum(rows.map(function (r) { return r.placed; })) / e * 100 : null; }
        Charts.line(byId('pl-trend'), { labels: batches.map(String), series: [{ name: 'Placement rate', values: batches.map(function (b) { var v = rate(pl.filter(function (r) { return r.batch === b; })); return v == null ? null : Math.round(v * 10) / 10; }) }] },
          { fmt: function (v) { return v + '%'; }, label: 'Placement rate by batch' });
        Charts.hbar(byId('pl-dept'), deptItems(function (d) { return rate(inDept(DATA.placements, d).filter(function (r) { return r.batch === S.batch; })) || 0; }, 'place'),
          { max: 100, onPick: pickDept, fmt: function (v) { return Math.round(v) + '%'; }, label: 'Placement rate by department' });
        Charts.hbar(byId('pl-pkg'), deptItems(function (d) { var r = inDept(DATA.placements, d).filter(function (x) { return x.batch === S.batch; }); var p = sum(r.map(function (x) { return x.placed; })); return p ? sum(r.map(function (x) { return (x.avg_package_lpa || 0) * x.placed; })) / p : 0; }),
          { onPick: pickDept, fmt: function (v) { return '₹' + n1(v); }, label: 'Average package by department' });
        var fy = inDept(DATA.students).filter(function (s) { return s.placement_status; });
        var cats = ['Placed', 'Unplaced', 'Not eligible', 'Opted out'];
        if (fy.length) Charts.vbar(byId('pl-now'), { labels: cats, series: [{ values: cats.map(function (c) { return fy.filter(function (s) { return s.placement_status === c; }).length; }), clsEach: ['good', 'warn', 'bad', 'muted'] }] }, { fmt: n0, label: 'Current batch placement status' });
        else byId('pl-now').innerHTML = empty('No final-year placement status in the student data.');
      }
      var placed = inDept(DATA.students).filter(function (s) { return s.placement_status === 'Placed' && s.company; });
      var g = {};
      placed.forEach(function (s) { var o = g[s.company] || (g[s.company] = { company: s.company, n: 0, pk: [], depts: [] }); o.n++; if (isNum(s.package_lpa)) o.pk.push(s.package_lpa); if (o.depts.indexOf(s.department) < 0) o.depts.push(s.department); });
      var rec = Object.keys(g).map(function (k) { var o = g[k]; o.avg = mean(o.pk); o.max = o.pk.length ? Math.max.apply(null, o.pk) : null; return o; }).sort(function (a, b) { return b.n - a.n || (b.avg || 0) - (a.avg || 0); });
      var t = '<table class="data"><thead><tr><th scope="col">Company</th><th class="r" scope="col">Offers</th><th class="r" scope="col">Average package</th><th class="r" scope="col">Highest</th><th scope="col">Departments</th></tr></thead><tbody>';
      rec.slice(0, 12).forEach(function (o) { t += '<tr><td><b>' + esc(o.company) + '</b></td><td class="r">' + o.n + '</td><td class="r">' + lpa(o.avg) + '</td><td class="r">' + lpa(o.max) + '</td><td class="muted">' + esc(o.depts.join(', ')) + '</td></tr>'; });
      if (!rec.length) t += '<tr><td colspan="5" class="muted">No offers recorded yet.</td></tr>';
      byId('pl-rec').innerHTML = t + '</tbody></table>';
    }
  };

  VIEWS.faculty = {
    title: 'Faculty',
    sub: function () { return 'Teaching staff for ' + scopeLabel() + '.'; },
    html: function () {
      var fa = inDept(DATA.faculty), m = metrics(currentDept());
      var phd = fa.length ? fa.filter(function (f) { return /ph\.?\s*d/i.test(f.qualification || ''); }).length / fa.length * 100 : null;
      var html = kpis([
        { label: 'Total faculty', value: n0(fa.length) },
        { label: 'With a Ph.D.', value: pct(phd), note: 'Share of faculty' },
        { label: 'Average experience', value: n1(mean(fa.map(function (f) { return f.experience_years; }))), note: 'Years' },
        { label: 'Students per teacher', value: n1(m.ratio), note: 'Lower means more attention per student' }
      ]);
      html += '<div class="grid2">' +
        panel('fa-dept', 'Faculty by department', '') +
        panel('fa-ratio', 'Students per teacher', 'By department') + '</div>';
      html += '<div class="grid2">' +
        panel('fa-des', 'Designation mix', '') +
        panel('fa-exp', 'Teaching experience', 'Number of faculty') + '</div>';
      html += '<section class="panel"><div class="panel-h"><h2>Faculty list</h2></div><div class="tools"><input type="search" id="fa-q" placeholder="Search name or designation" aria-label="Search faculty" value="' + esc(S.fac.q) + '"></div><div class="tbl" id="fa-table"></div></section>';
      return html;
    },
    after: function () {
      var fa = inDept(DATA.faculty);
      var designations = ['Professor', 'Associate Professor', 'Assistant Professor'];
      var expBands = [['0–5 yrs', 0, 5], ['6–10', 6, 10], ['11–15', 11, 15], ['16–20', 16, 20], ['21+', 21, 99]];
      Charts.hbar(byId('fa-dept'), deptItems(function (d) { return inDept(DATA.faculty, d).length; }), { onPick: pickDept, fmt: n0, label: 'Faculty by department' });
      Charts.hbar(byId('fa-ratio'), deptItems(function (d) { return metrics(d).ratio || 0; }), { onPick: pickDept, fmt: n1, label: 'Students per teacher' });
      var des = designations.concat(uniq(fa.map(function (f) { return f.designation; })).filter(function (d) { return designations.indexOf(d) < 0; }));
      Charts.vbar(byId('fa-des'), { labels: des.map(function (d) { return d.replace(' Professor', ' Prof.'); }), series: [{ values: des.map(function (d) { return fa.filter(function (f) { return f.designation === d; }).length; }) }] }, { fmt: n0, label: 'Designation mix' });
      Charts.vbar(byId('fa-exp'), { labels: expBands.map(function (b) { return b[0]; }), series: [{ values: expBands.map(function (b) { return fa.filter(function (f) { return f.experience_years >= b[1] && f.experience_years <= b[2]; }).length; }) }] }, { fmt: n0, label: 'Teaching experience' });
      drawFacultyTable();
      byId('fa-q').addEventListener('input', function (e) { S.fac.q = e.target.value; drawFacultyTable(); });
    }
  };

  function drawFacultyTable() {
    var q = S.fac.q.trim().toLowerCase();
    var rows = inDept(DATA.faculty).filter(function (f) { return !q || (f.name + ' ' + f.designation + ' ' + f.faculty_id).toLowerCase().indexOf(q) >= 0; });
    rows.sort(by(S.fac.sort, S.fac.dir));
    var t = '<table class="data"><thead><tr>' + sortHead('faculty_id', 'ID', S.fac) + sortHead('name', 'Name', S.fac) + sortHead('department', 'Dept', S.fac) +
      sortHead('designation', 'Designation', S.fac) + sortHead('qualification', 'Qualification', S.fac) + sortHead('experience_years', 'Experience', S.fac, true) + '</tr></thead><tbody>';
    rows.forEach(function (f) {
      t += '<tr><td class="muted">' + esc(f.faculty_id) + '</td><td>' + esc(f.name) + '</td><td>' + esc(f.department) + '</td><td>' + esc(f.designation) + '</td><td>' + esc(f.qualification || '–') + '</td><td class="r">' + (isNum(f.experience_years) ? f.experience_years + ' yrs' : '–') + '</td></tr>';
    });
    if (!rows.length) t += '<tr><td colspan="6" class="muted">No faculty match.</td></tr>';
    var box = byId('fa-table');
    box.innerHTML = t + '</tbody></table><div class="pager"><span>' + n0(rows.length) + ' faculty</span></div>';
    bindSort(box, S.fac, drawFacultyTable);
  }

  // ------------------------------------------------------------------ CSV import
  function guessDataset(fileName, header) {
    var base = fileName.toLowerCase().replace(/\.csv$/, '');
    for (var i = 0; i < DS_KEYS.length; i++) if (base.indexOf(DS_KEYS[i]) >= 0) return DS_KEYS[i];
    if (base.indexOf('attendance') >= 0) return 'attendance_history';
    var best = null, score = 0;
    DS_KEYS.forEach(function (k) {
      var req = SPEC[k].required, hit = req.filter(function (c) { return header.indexOf(c) >= 0; }).length;
      if (hit === req.length && hit > score) { best = k; score = hit; }
    });
    return best;
  }

  function normalise(k, rec) {
    var o = {};
    SPEC[k].cols.forEach(function (c) { o[c] = rec[c] == null ? '' : rec[c]; });
    SPEC[k].num.forEach(function (c) {
      if (o[c] === '') return;
      var v = parseFloat(String(o[c]).replace(/[%,₹\s]/g, ''));
      o[c] = isNaN(v) ? '' : v;
    });
    if (o.department) o.department = String(o.department).trim().toUpperCase();
    if (k === 'students') {
      var r = String(o.result || '').toLowerCase();
      o.result = /pass/.test(r) ? 'Pass' : /back|fail|atkt|reappear/.test(r) ? 'Backlog' : r ? 'Awaited' : 'Awaited';
      var p = String(o.placement_status || '').toLowerCase();
      o.placement_status = !p ? '' : /not\s*elig|inelig/.test(p) ? 'Not eligible' : /opt|higher/.test(p) ? 'Opted out' : /unplaced|not\s*placed/.test(p) ? 'Unplaced' : /placed|yes|selected/.test(p) ? 'Placed' : '';
      var gd = String(o.gender || '').toLowerCase();
      o.gender = /^f/.test(gd) ? 'F' : /^m/.test(gd) ? 'M' : gd ? 'Other' : '';
    }
    return o;
  }

  function importText(k, text, fileName) {
    var parsed = CSV.parse(text), sp = SPEC[k];
    if (!parsed.records.length) return { cls: 'err', text: fileName + ' has no rows under the header line.' };
    var missing = sp.required.filter(function (c) { return parsed.header.indexOf(c) < 0; });
    if (missing.length) return { cls: 'err', text: fileName + ' is missing the column' + (missing.length > 1 ? 's ' : ' ') + missing.join(', ') + '. Nothing was changed.' };
    var skipped = 0, rows = [];
    parsed.records.forEach(function (rec) {
      var o = normalise(k, rec);
      var bad = sp.required.some(function (c) { return o[c] === '' || o[c] == null; });
      if (bad) skipped++; else rows.push(o);
    });
    if (!rows.length) return { cls: 'err', text: 'Every row in ' + fileName + ' was missing a required value. Nothing was changed.' };
    DATA[k] = rows;
    var uploadTime = new Date().toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
    SOURCE[k] = { type: 'upload', file: fileName, at: uploadTime };
    var kept = saveUploads();

    // Log this upload
    addUploadLog({
      time: uploadTime,
      file: fileName,
      dataset: k,
      loaded: rows.length,
      skipped: skipped
    });

    return { cls: 'ok', text: 'Loaded ' + n0(rows.length) + ' rows from ' + fileName + '.' + (skipped ? ' Skipped ' + skipped + ' rows with a required value missing.' : '') + (kept ? '' : ' The file is too large to remember, so it will reset when you reload the page.') };
  }

  function readFiles(files, forced) {
    var pending = files.length;
    files.forEach(function (file) {
      var reader = new FileReader();
      reader.onload = function () {
        var text = String(reader.result), k = forced || guessDataset(file.name, CSV.parse(text.split(/\r?\n/).slice(0, 2).join('\n')).header);
        if (!k) S.msgs._ = { cls: 'err', text: 'Could not tell which dataset ' + file.name + ' belongs to. Rename it, for example to students.csv.' };
        else S.msgs[k] = importText(k, text, file.name);
        if (--pending === 0) {
          S.dept = visibleDepts().indexOf(S.dept) >= 0 ? S.dept : 'ALL';
          render();
          if (S.msgs._) {
            var d = byId('drop');
            if (d) d.insertAdjacentHTML('beforeend', '<p style="color:var(--bad)">' + esc(S.msgs._.text) + '</p>');
            delete S.msgs._;
          }
        }
      };
      reader.onerror = function () { S.msgs[forced || '_'] = { cls: 'err', text: 'Could not read ' + file.name + '.' }; if (--pending === 0) render(); };
      reader.readAsText(file);
    });
  }

  // ------------------------------------------------------------------ roles & authentication
  var ROLES = {
    admin: {
      label: 'Admin Console',
      sub: 'Data & System',
      home: 'data_health',
      pages: [
        ['data_health', 'Data health'],
        ['upload_data', 'Upload data'],
        ['users', 'Users'],
        ['settings', 'Settings'],
        ['upload_log', 'Upload log']
      ]
    },
    director: {
      label: 'Executive View',
      sub: 'Institutional Analytics',
      home: 'executive_summary',
      pages: [
        ['executive_summary', 'Executive summary'],
        ['dept_comparison', 'Department comparison'],
        ['academics', 'Academics'],
        ['admissions', 'Admissions'],
        ['placements', 'Placements'],
        ['faculty', 'Faculty'],
        ['summary_report', 'Summary report']
      ]
    },
    hod: {
      label: 'Department',
      sub: 'Head of Department',
      home: 'my_department',
      pages: [
        ['my_department', 'My department'],
        ['students_at_risk', 'Students at risk'],
        ['subjects', 'Subjects'],
        ['faculty', 'Faculty'],
        ['placements', 'Placements']
      ]
    },
    student: {
      label: 'Student Portal',
      sub: 'IILM University',
      home: 'my_profile',
      pages: [
        ['my_profile', 'My profile'],
        ['my_attendance', 'My attendance'],
        ['my_results', 'My results'],
        ['placement', 'Placement']
      ]
    }
  };

  function findUser(u, p) {
    u = String(u || '').trim().toLowerCase();
    if (u === 'admin' && p === 'admin123') return { name: 'Data Administrator', role: 'admin', roleLabel: 'Administrator' };
    if (u === 'director' && p === 'director123') return { name: 'Director', role: 'director', roleLabel: 'Director, all departments' };

    var m = /^hod\.([a-z0-9]+)$/.exec(u);
    if (m && p === 'hod123') {
      var dept = m[1].toUpperCase();
      if (allDepts().indexOf(dept) >= 0) return { name: 'Head of ' + dept, role: 'hod', dept: dept, roleLabel: 'Head of Department, ' + dept };
    }

    // Student roll number login
    var stList = DATA.students || [];
    var matchedStudent = stList.find(function (s) {
      return String(s.student_id).trim().toLowerCase() === u;
    });
    if (matchedStudent && p === 'student123') {
      return {
        name: matchedStudent.name,
        role: 'student',
        student_id: matchedStudent.student_id,
        dept: matchedStudent.department,
        roleLabel: matchedStudent.department + ' · ' + matchedStudent.student_id
      };
    }

    return null;
  }

  function renderLogin(err) {
    var sampleStudent = (DATA.students && DATA.students.length) ? DATA.students[0] : { student_id: '2410030001', name: 'Demo Student' };

    document.getElementById('root').innerHTML =
      '<div class="login">' +
      '<div class="login-theme-bar">' + themeSwitchHtml() + '</div>' +
      '<div class="login-art"><div><h1>Institutional Analytics &amp; Executive Dashboard</h1>' +
      '<p>Students, attendance, exam results, faculty, admissions and placements in one place, so management can see how each department is doing without collecting reports by hand.</p></div>' +
      '<small>B.Tech CSE major project, IILM University, Greater Noida</small></div>' +
      '<form class="login-form" id="login-form" novalidate><div><h2>Sign in</h2><p class="muted" style="margin-top:4px">What you see depends on your role.</p></div>' +
      '<div class="field"><label for="lg-user">Username or Roll number</label><input id="lg-user" autocomplete="username" placeholder="e.g. admin, director, hod.cse, or roll no." required></div>' +
      '<div class="field"><label for="lg-pass">Password</label><input id="lg-pass" type="password" autocomplete="current-password" required></div>' +
      '<p class="error" id="lg-err" role="alert">' + esc(err || '') + '</p>' +
      '<button class="btn" type="submit">Sign in</button>' +
      '<div class="demo"><b>Demo accounts</b><table><tbody>' +
      '<tr><td><code>admin</code> / <code>admin123</code></td><td>Data health QA, CSV upload &amp; settings</td><td><button type="button" class="use" data-u="admin" data-p="admin123">Use</button></td></tr>' +
      '<tr><td><code>director</code> / <code>director123</code></td><td>Executive overview &amp; department rankings</td><td><button type="button" class="use" data-u="director" data-p="director123">Use</button></td></tr>' +
      '<tr><td><code>hod.cse</code> / <code>hod123</code></td><td>CSE view: at-risk students &amp; subjects (or ece, me, ce, bba, mba)</td><td><button type="button" class="use" data-u="hod.cse" data-p="hod123">Use</button></td></tr>' +
      '<tr><td><code>' + esc(sampleStudent.student_id) + '</code> / <code>student123</code></td><td>Student portal for ' + esc(sampleStudent.name) + ' (' + esc(sampleStudent.department) + ')</td><td><button type="button" class="use" data-u="' + esc(sampleStudent.student_id) + '" data-p="student123">Use</button></td></tr>' +
      '</tbody></table></div></form></div>';

    bindThemeEvents(document.getElementById('root'));

    document.querySelectorAll('.use').forEach(function (b) {
      b.addEventListener('click', function () {
        byId('lg-user').value = b.getAttribute('data-u');
        byId('lg-pass').value = b.getAttribute('data-p');
        byId('lg-pass').focus();
      });
    });

    byId('login-form').addEventListener('submit', function (e) {
      e.preventDefault();
      var u = findUser(byId('lg-user').value, byId('lg-pass').value);
      if (!u) {
        byId('lg-err').textContent = 'Invalid credentials. Please use one of the demo accounts listed below.';
        return;
      }
      u.username = byId('lg-user').value.trim().toLowerCase();
      S.user = u;
      S.dept = u.role === 'hod' ? u.dept : 'ALL';
      var ss = sess();
      if (ss) storageSet(ss, SESSION_KEY, u);

      var conf = ROLES[u.role];
      S.view = conf ? conf.home : 'executive_summary';
      try { history.replaceState(null, '', '#' + S.view); } catch (er) { location.hash = S.view; }
      render();
    });
  }

  function restoreSession() {
    var ss = sess(); if (!ss) return;
    var saved = storageGet(ss, SESSION_KEY);
    if (!saved || ['admin', 'director', 'hod', 'student'].indexOf(saved.role) < 0) return;
    if (saved.role === 'hod' && allDepts().indexOf(saved.dept) < 0) return;
    if (saved.role === 'student' && !saved.student_id) return;
    S.user = saved;
    if (S.user.role === 'hod') S.dept = S.user.dept;
  }

  // ------------------------------------------------------------------ shell + routing
  function byId(id) { return document.getElementById(id); }

  function renderShell() {
    var root = byId('root');
    var role = S.user.role;
    var conf = ROLES[role] || { label: 'Institutional Analytics', sub: 'Executive Dashboard' };
    var brandTitle = role === 'hod' ? (S.user.dept + ' Department') : conf.label;
    var brandSub = role === 'hod' ? 'Head of Department' : conf.sub;

    var curApp = document.querySelector('.app');
    if (curApp && byId('view')) {
      curApp.setAttribute('data-role', role);
      var bt = byId('brand-title'), bs = byId('brand-sub');
      if (bt) bt.textContent = brandTitle;
      if (bs) bs.textContent = brandSub;
      return;
    }

    root.innerHTML = '<div class="app" data-role="' + esc(role) + '">' +
      '<aside class="side"><div class="brand"><b id="brand-title">' + esc(brandTitle) + '</b><span id="brand-sub">' + esc(brandSub) + '</span></div>' +
      '<nav class="nav" id="nav" aria-label="Modules"></nav>' +
      '<div class="me"><div id="side-theme-wrap">' + themeSwitchHtml() + '</div><b id="me-name"></b><span id="me-role"></span><button type="button" id="signout">Sign out</button></div></aside>' +
      '<main class="main"><header class="bar"><div><h1 id="vt"></h1><p id="vs"></p></div><div class="bar-r" id="bar-r"></div></header><div id="view"></div></main></div>';

    byId('signout').addEventListener('click', function () {
      S.user = null;
      var ss = sess(); if (ss) storageDel(ss, SESSION_KEY);
      try { history.replaceState(null, '', ' '); } catch (e) { location.hash = ''; }
      render();
    });
    bindThemeEvents(byId('side-theme-wrap'));
  }

  function isPageAllowed(role, page) {
    if (!ROLES[role]) return false;
    return ROLES[role].pages.some(function (p) { return p[0] === page; });
  }

  function getRoleHome(role) {
    return ROLES[role] ? ROLES[role].home : 'executive_summary';
  }

  function render() {
    if (!S.user) { renderLogin(); return; }
    renderShell();

    var role = S.user.role;
    var conf = ROLES[role];
    if (!conf) { S.user = null; renderLogin(); return; }

    // Route guard: enforce role-scoped pages
    if (!isPageAllowed(role, S.view)) {
      S.view = getRoleHome(role);
      try { history.replaceState(null, '', '#' + S.view); } catch (e) { location.hash = S.view; }
    }

    var v = VIEWS[S.view];
    if (!v) {
      S.view = getRoleHome(role);
      v = VIEWS[S.view];
    }

    // Build sidebar menu for current role
    byId('nav').innerHTML = conf.pages.map(function (n) {
      return '<a href="#' + n[0] + '"' + (n[0] === S.view ? ' aria-current="page"' : '') + '>' + esc(n[1]) + '</a>';
    }).join('');

    byId('me-name').textContent = S.user.name;
    byId('me-role').textContent = S.user.roleLabel;
    byId('vt').textContent = typeof v.title === 'function' ? v.title() : v.title;
    byId('vs').textContent = typeof v.sub === 'function' ? v.sub() : (v.sub || '');

    // Top control bar right section
    var anyUpload = DS_KEYS.some(function (k) { return SOURCE[k] && SOURCE[k].type === 'upload'; });
    var anySample = DS_KEYS.some(function (k) { return SOURCE[k] && SOURCE[k].type === 'sample'; });
    var badge = anySample ? '<span class="badge" title="Built-in seeded sample data">' + (anyUpload ? 'Partly sample data' : 'Sample data') + '</span>' : '<span class="badge real">Your data</span>';

    var topControls = '';
    if (role === 'director' && S.view !== 'summary_report') {
      topControls = '<label for="dept">Department</label><select id="dept"><option value="ALL">All departments</option>' +
        allDepts().map(function (d) { return '<option value="' + esc(d) + '"' + (S.dept === d ? ' selected' : '') + '>' + esc(d) + ' – ' + esc(deptName(d)) + '</option>'; }).join('') + '</select>' + badge;
    } else if (role === 'admin' || role === 'hod') {
      topControls = badge;
    }

    byId('bar-r').innerHTML = topControls + themeSwitchHtml();
    bindThemeEvents(byId('bar-r'));

    var sel = byId('dept');
    if (sel) {
      sel.addEventListener('change', function (e) {
        S.dept = e.target.value;
        render();
      });
    }

    byId('view').innerHTML = v.html();
    if (v.after) v.after();
  }

  // ------------------------------------------------------------------ listeners & initialization
  window.addEventListener('hashchange', function () {
    var h = location.hash.replace('#', '');
    if (S.user) {
      if (isPageAllowed(S.user.role, h)) {
        if (h !== S.view) { S.view = h; render(); window.scrollTo(0, 0); }
      } else {
        S.view = getRoleHome(S.user.role);
        try { history.replaceState(null, '', '#' + S.view); } catch (e) { location.hash = S.view; }
        render();
        window.scrollTo(0, 0);
      }
    } else {
      render();
    }
  });

  var lastW = window.innerWidth, timer = null;
  window.addEventListener('resize', function () {
    clearTimeout(timer);
    timer = setTimeout(function () {
      if (Math.abs(window.innerWidth - lastW) > 30 && S.user) {
        lastW = window.innerWidth;
        var y = window.scrollY;
        render();
        window.scrollTo(0, y);
      }
    }, 180);
  });

  function init() {
    restoreSession();
    var start = location.hash.replace('#', '');
    if (S.user) {
      if (isPageAllowed(S.user.role, start)) S.view = start;
      else S.view = getRoleHome(S.user.role);
    }
    render();
  }

  // Expose App namespace for role view registration
  root.App = {
    SPEC: SPEC,
    DS_KEYS: DS_KEYS,
    DATA: DATA,
    SOURCE: SOURCE,
    loadSample: loadSample,
    saveUploads: saveUploads,
    readFiles: readFiles,

    getSettings: getSettings,
    saveSettings: saveSettings,
    getMinAttendance: getMinAttendance,
    getPassMark: getPassMark,
    getBands: getBands,

    getUploadLog: getUploadLog,
    addUploadLog: addUploadLog,
    clearUploadLog: clearUploadLog,

    S: S,
    ROLES: ROLES,
    VIEWS: VIEWS,

    isNum: isNum,
    sum: sum,
    mean: mean,
    uniq: uniq,
    n0: n0,
    n1: n1,
    pct: pct,
    lpa: lpa,
    by: by,
    status: status,
    deptName: deptName,
    allDepts: allDepts,
    visibleDepts: visibleDepts,
    currentDept: currentDept,
    inDept: inDept,
    scopeLabel: scopeLabel,
    latest: latest,
    termSort: termSort,
    metrics: metrics,
    subjectStats: subjectStats,
    attentionItems: attentionItems,
    kpis: kpis,
    panel: panel,
    changeNote: changeNote,
    sortHead: sortHead,
    bindSort: bindSort,
    pickDept: pickDept,
    deptItems: deptItems,
    empty: empty,
    pager: pager,
    bindPager: bindPager,
    drawAttendanceTrend: drawAttendanceTrend,
    byId: byId,
    render: render,
    init: init
  };

  // Run init when DOM is loaded or in next tick after all scripts load
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    setTimeout(init, 0);
  }

})(window);
