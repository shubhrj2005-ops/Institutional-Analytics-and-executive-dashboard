/*
 * Institutional Analytics & Executive Dashboard
 * Role View: Student Portal
 *
 * Pages:
 *   my_profile: Enrolment record, student ID, program, semester and standing
 *   my_attendance: Current attendance %, examination eligibility alert and department comparison
 *   my_results: Subject-wise marks, pass/fail status, and student vs class average comparison chart
 *   placement: Final-year campus placement status, company and package (or status notice)
 */
(function (root) {
  'use strict';

  var App = root.App;
  var esc = Charts.esc;

  function getActiveStudent() {
    if (!App.S.user || App.S.user.role !== 'student') return null;
    var sid = String(App.S.user.student_id || '').trim();
    return (App.DATA.students || []).find(function (s) {
      return String(s.student_id).trim() === sid;
    });
  }

  App.VIEWS.my_profile = {
    title: 'My profile',
    sub: function () { return 'Academic enrolment record and student credentials.'; },
    html: function () {
      var s = getActiveStudent();
      if (!s) return App.empty('Student record not found. Please sign in again.');

      var standing = s.result === 'Pass' ? '<span class="chip good">Good standing (Pass)</span>'
        : s.result === 'Backlog' ? '<span class="chip bad">Academic backlog</span>'
        : '<span class="chip plain">Results awaited</span>';

      var minAtt = App.getMinAttendance();
      var attOk = App.isNum(s.attendance_pct) && s.attendance_pct >= minAtt;

      var html = '<div class="profile-card">' +
        '<div class="profile-top">' +
        '<div class="profile-name"><h2>' + esc(s.name) + '</h2><span class="roll">Roll No: ' + esc(s.student_id) + '</span></div>' +
        '<div>' + standing + '</div>' +
        '</div>' +
        '<div class="profile-grid">' +
        '<div class="profile-item"><span>Department</span><b>' + esc(App.deptName(s.department)) + ' (' + esc(s.department) + ')</b></div>' +
        '<div class="profile-item"><span>Degree program</span><b>' + esc(s.program || 'Undergraduate') + '</b></div>' +
        '<div class="profile-item"><span>Current stage</span><b>Year ' + esc(s.year) + ', Semester ' + esc(s.semester) + '</b></div>' +
        '<div class="profile-item"><span>Admission year</span><b>' + esc(s.admission_year || '–') + '</b></div>' +
        '<div class="profile-item"><span>Gender</span><b>' + (s.gender === 'F' ? 'Female' : s.gender === 'M' ? 'Male' : esc(s.gender || '–')) + '</b></div>' +
        '<div class="profile-item"><span>Examination eligibility</span><b>' + (attOk ? '<span style="color:var(--good)">Eligible</span>' : '<span style="color:var(--bad)">At risk</span>') + '</b></div>' +
        '</div></div>';

      html += App.kpis([
        { label: 'Current attendance', value: App.pct(s.attendance_pct), cls: App.status('att', s.attendance_pct) },
        { label: 'Average examination marks', value: App.isNum(s.avg_marks) ? App.n1(s.avg_marks) : 'Awaited', note: 'Out of 100', cls: App.status('marks', s.avg_marks) },
        { label: 'Academic standing', value: esc(s.result || 'Awaited'), cls: s.result === 'Pass' ? 'good' : s.result === 'Backlog' ? 'bad' : 'plain' },
        { label: 'Placement', value: s.placement_status ? esc(s.placement_status) : 'Opens Year ' + (s.program === 'MBA' ? '2' : s.program === 'BBA' ? '3' : '4'), cls: s.placement_status === 'Placed' ? 'good' : 'plain' }
      ]);

      return html;
    },
    after: function () {}
  };

  App.VIEWS.my_attendance = {
    title: 'My attendance',
    sub: function () { return 'Current term attendance record and semester examination eligibility status.'; },
    html: function () {
      var s = getActiveStudent();
      if (!s) return App.empty('Student record not found.');

      var minAtt = App.getMinAttendance();
      var att = s.attendance_pct;
      var isEligible = App.isNum(att) && att >= minAtt;

      var deptStudents = App.inDept(App.DATA.students, s.department);
      var deptAvg = App.mean(deptStudents.map(function (x) { return x.attendance_pct; }));
      var diff = App.isNum(att) && App.isNum(deptAvg) ? (att - deptAvg) : null;

      var html = '<div class="banner ' + (isEligible ? 'good' : 'bad') + '">';
      if (isEligible) {
        html += '<b>You are above the ' + minAtt + '% minimum</b>' +
          '<p>Your current attendance is ' + App.pct(att) + ', which meets the university requirement. You are eligible to sit for upcoming semester examinations.</p>';
      } else {
        html += '<b>You are below the ' + minAtt + '% minimum and may not be allowed to sit exams</b>' +
          '<p>Your current attendance is ' + App.pct(att) + ', which is below the mandatory ' + minAtt + '% threshold. Please contact your department HOD (' + esc(s.department) + ') and course faculty immediately.</p>';
      }
      html += '</div>';

      html += App.kpis([
        { label: 'Your attendance', value: App.pct(att), note: 'Current term', cls: App.status('att', att) },
        { label: 'Minimum required', value: minAtt + '%', note: 'University policy' },
        { label: 'Department average', value: App.pct(deptAvg), note: esc(s.department) + ' cohort average' },
        { label: 'Difference from cohort', value: diff != null ? (diff >= 0 ? '+' : '') + App.n1(diff) + '%' : '–', cls: diff != null && diff >= 0 ? 'good' : 'bad' }
      ]);

      html += '<section class="panel"><div class="panel-h"><h2>Attendance details</h2></div>' +
        '<p class="muted">Attendance is updated bi-weekly from lecture and laboratory logs. Maintaining attendance above ' + minAtt + '% is mandatory under university academic regulations to receive admit cards for end-term examinations.</p>' +
        '</section>';

      return html;
    },
    after: function () {}
  };

  App.VIEWS.my_results = {
    title: 'My results',
    sub: function () { return 'Semester examination score sheet and class performance comparison.'; },
    html: function () {
      var s = getActiveStudent();
      if (!s) return App.empty('Student record not found.');

      var passMark = App.getPassMark();
      var sid = String(s.student_id).trim();

      // Find results for this student
      var myResults = (App.DATA.results || []).filter(function (r) {
        return String(r.student_id).trim() === sid;
      });

      // If student is in year 1 or has no results recorded yet
      if (!myResults.length) {
        return '<div class="panel"><div class="panel-h"><h2>Results not out yet</h2></div>' +
          '<p class="muted" style="font-size:0.95rem;line-height:1.6">First-year examination scores are currently under academic evaluation. ' +
          'Subject results and grade transcripts will be published here once marks compilation is complete.</p></div>';
      }

      var passedSubs = myResults.filter(function (r) { return r.marks >= passMark; }).length;
      var failedSubs = myResults.length - passedSubs;
      var myAvg = App.mean(myResults.map(function (r) { return r.marks; }));

      var html = App.kpis([
        { label: 'Average marks', value: App.n1(myAvg), note: 'Out of 100', cls: App.status('marks', myAvg) },
        { label: 'Subjects cleared', value: passedSubs + ' / ' + myResults.length, cls: failedSubs ? 'bad' : 'good' },
        { label: 'Academic standing', value: failedSubs ? 'Backlog' : 'Pass', note: failedSubs ? failedSubs + ' subject(s) to clear' : 'All cleared', cls: failedSubs ? 'bad' : 'good' },
        { label: 'Pass mark standard', value: String(passMark), note: 'Minimum required' }
      ]);

      html += '<div class="panel"><div class="panel-h"><h2>Subject score comparison</h2><p>Your marks compared to the department class average for each subject</p></div>' +
        '<div class="chart" id="st-marks-chart"></div>' +
        '<div class="legend" style="margin-top:10px"><span><i></i>My marks</span><span><i class="muted"></i>Class average</span><span><i class="dash" style="border-color:var(--bad)"></i>Pass mark (' + passMark + ')</span></div>' +
        '</div>';

      html += '<section class="panel"><div class="panel-h"><h2>Subject-wise scorecard</h2></div>' +
        '<div class="tbl"><table class="data"><thead><tr>' +
        '<th scope="col">Subject code</th><th scope="col">Subject name</th><th class="r" scope="col">Your marks</th><th class="r" scope="col">Class average</th><th scope="col">Result</th>' +
        '</tr></thead><tbody>';

      // Pre-calculate class averages for each subject
      var allResults = App.DATA.results || [];

      myResults.forEach(function (r) {
        var subClassResults = allResults.filter(function (x) {
          return x.department === r.department && (x.subject_code === r.subject_code || x.subject === r.subject);
        });
        var classAvg = App.mean(subClassResults.map(function (x) { return x.marks; }));
        var isPass = r.marks >= passMark;

        html += '<tr><td><code>' + esc(r.subject_code || '–') + '</code></td>' +
          '<td><b>' + esc(r.subject) + '</b></td>' +
          '<td class="r num" style="font-weight:700">' + App.n1(r.marks) + '</td>' +
          '<td class="r num muted">' + App.n1(classAvg) + '</td>' +
          '<td><span class="chip ' + (isPass ? 'good' : 'bad') + '">' + (isPass ? 'Pass' : 'Fail') + '</span></td></tr>';
      });

      html += '</tbody></table></div></section>';
      return html;
    },
    after: function () {
      var s = getActiveStudent();
      if (!s) return;
      var sid = String(s.student_id).trim();
      var myResults = (App.DATA.results || []).filter(function (r) {
        return String(r.student_id).trim() === sid;
      });
      if (!myResults.length) return;

      var allResults = App.DATA.results || [];
      var labels = myResults.map(function (r) { return r.subject; });
      var myMarks = myResults.map(function (r) { return r.marks; });
      var classAvgs = myResults.map(function (r) {
        var subClassResults = allResults.filter(function (x) {
          return x.department === r.department && (x.subject_code === r.subject_code || x.subject === r.subject);
        });
        var avg = App.mean(subClassResults.map(function (x) { return x.marks; }));
        return avg != null ? Math.round(avg * 10) / 10 : 0;
      });

      Charts.vbar(App.byId('st-marks-chart'), {
        labels: labels,
        series: [
          { name: 'My marks', values: myMarks },
          { name: 'Class average', values: classAvgs, cls: 'muted' }
        ]
      }, {
        height: 240,
        fmt: function (v) { return Math.round(v); },
        label: 'My marks vs class average'
      });
    }
  };

  App.VIEWS.placement = {
    title: 'Placement',
    sub: function () { return 'Campus recruitment status and career opportunities.'; },
    html: function () {
      var s = getActiveStudent();
      if (!s) return App.empty('Student record not found.');

      // Check if student is in final year or has placement status
      if (!s.placement_status) {
        return '<div class="panel"><div class="panel-h"><h2>Placement opens in your final year</h2></div>' +
          '<p class="muted" style="font-size:0.95rem;line-height:1.6">Campus recruitment drives and company registrations commence during the final academic year. ' +
          'Career counselling, technical mock interviews, and resume building workshops will be announced by the corporate resource center in your pre-final semester.</p></div>';
      }

      var html = App.kpis([
        { label: 'Placement status', value: esc(s.placement_status), cls: s.placement_status === 'Placed' ? 'good' : s.placement_status === 'Unplaced' ? 'warn' : 'bad' },
        { label: 'Company', value: s.company ? esc(s.company) : '–' },
        { label: 'Package offer', value: App.isNum(s.package_lpa) ? App.lpa(s.package_lpa) : '–' },
        { label: 'Passing batch', value: String(2026) }
      ]);

      html += '<section class="panel"><div class="panel-h"><h2>Recruitment details</h2></div>';
      if (s.placement_status === 'Placed') {
        html += '<p>Congratulations on your campus selection with <b>' + esc(s.company) + '</b> at an annual package of <b>' + App.lpa(s.package_lpa) + '</b>.</p>' +
          '<p class="muted" style="margin-top:8px">Please submit your signed offer acceptance letter to the Department Placement Coordinator to confirm corporate onboarding dates.</p>';
      } else if (s.placement_status === 'Unplaced') {
        html += '<p>You are actively participating in campus placement drives. Continue applying for upcoming recruitment rounds scheduled on the campus placement portal.</p>';
      } else if (s.placement_status === 'Opted out') {
        html += '<p>Your record indicates you have opted out of campus recruitment to pursue higher education, entrepreneurship, or competitive examinations.</p>';
      } else {
        html += '<p>Placement eligibility requires clearing all semester backlogs and satisfying minimum attendance requirements.</p>';
      }
      html += '</section>';

      return html;
    },
    after: function () {}
  };

})(window);
