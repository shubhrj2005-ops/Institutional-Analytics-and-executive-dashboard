/* Small CSV reader/writer. Handles quoted fields, commas and line breaks inside quotes, and Excel's BOM. */
(function (root) {
  'use strict';

  function parse(text) {
    text = String(text).replace(/^﻿/, '');
    var rows = [], row = [], field = '', inQuotes = false;
    for (var i = 0; i < text.length; i++) {
      var c = text[i];
      if (inQuotes) {
        if (c === '"') {
          if (text[i + 1] === '"') { field += '"'; i++; }
          else inQuotes = false;
        } else field += c;
      } else if (c === '"') inQuotes = true;
      else if (c === ',') { row.push(field); field = ''; }
      else if (c === '\n' || c === '\r') {
        if (c === '\r' && text[i + 1] === '\n') i++;
        row.push(field); field = '';
        if (row.length > 1 || row[0] !== '') rows.push(row);
        row = [];
      } else field += c;
    }
    if (field !== '' || row.length) { row.push(field); if (row.length > 1 || row[0] !== '') rows.push(row); }
    if (!rows.length) return { header: [], records: [] };
    var header = rows[0].map(function (h) { return h.trim().toLowerCase().replace(/[\s\-]+/g, '_').replace(/[^a-z0-9_]/g, ''); });
    var records = rows.slice(1).map(function (cells) {
      var o = {};
      header.forEach(function (h, k) { o[h] = cells[k] == null ? '' : String(cells[k]).trim(); });
      return o;
    });
    return { header: header, records: records };
  }

  function stringify(rows, cols) {
    function cell(v) {
      v = v == null ? '' : String(v);
      return /[",\n\r]/.test(v) ? '"' + v.replace(/"/g, '""') + '"' : v;
    }
    return [cols.join(',')].concat(rows.map(function (r) { return cols.map(function (c) { return cell(r[c]); }).join(','); })).join('\n') + '\n';
  }

  var api = { parse: parse, stringify: stringify };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.CSV = api;
})(this);
