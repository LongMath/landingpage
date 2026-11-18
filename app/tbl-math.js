/* TBLMath: hiển thị công thức LaTeX bằng KaTeX cho Toán Bác Long.
   Quy ước viết trong đề, lựa chọn, gợi ý, lời giải:  $...$ (trong dòng)   $$...$$ (riêng một khối)   \(...\)   \[...\]
   Muốn hiện dấu đô la thường thì viết \$.   Quy tắc nhận $...$ chặt như Pandoc: sau $ mở phải là chữ (không phải khoảng trắng),
   trước $ đóng không được là khoảng trắng và sau $ đóng không được là chữ số. Nhờ vậy "Giá 5$ và 7$" KHÔNG bị nhầm thành công thức.
   An toàn: không chạy lệnh nguy hiểm (trust=false). Mất mạng hoặc công thức lỗi: giữ nguyên chữ gốc.
   KaTeX chỉ được tải khi trang thật sự có công thức. */
(function (root, factory) { var api = factory(root); if (typeof module === 'object' && module.exports) module.exports = api; else root.TBLMath = api; })(typeof self !== 'undefined' ? self : this, function (root) {
  'use strict';
  var VER = '0.16.11', BASE = 'https://cdn.jsdelivr.net/npm/katex@' + VER + '/dist/';
  var OPTS = { throwOnError: false, strict: 'ignore', trust: false, maxExpand: 1000, errorColor: '#B3261E', output: 'htmlAndMathml' };
  var isSpace = function (c) { return c === ' ' || c === '\t' || c === '\n' || c === '\r' || c === '\u00a0'; };
  var isDigit = function (c) { return c >= '0' && c <= '9'; };

  /* Tách một chuỗi thành các đoạn: { t: 'text', s } hoặc { t: 'math', s: biểu thức, d: true nếu hiển thị riêng, raw: nguyên văn }.
     Dấu \$ trong đoạn chữ được đổi thành $. Trả thêm số dấu $ lẻ (không thành cặp). */
  function split(src) {
    var s = String(src == null ? '' : src), out = [], buf = '', i = 0, n = s.length, loose = 0;
    function flush() { if (buf) { out.push({ t: 'text', s: buf }); buf = ''; } }
    while (i < n) {
      var c = s[i];
      if (c === '\\' && s[i + 1] === '$') { buf += '$'; i += 2; continue; }
      if (c === '\\' && (s[i + 1] === '(' || s[i + 1] === '[')) {
        var close = s[i + 1] === '(' ? '\\)' : '\\]', j = s.indexOf(close, i + 2);
        if (j > i + 2) { flush(); out.push({ t: 'math', s: s.slice(i + 2, j), d: s[i + 1] === '[', raw: s.slice(i, j + 2) }); i = j + 2; continue; }
      }
      if (c === '$') {
        if (s[i + 1] === '$') {
          var k = s.indexOf('$$', i + 2);
          if (k > i + 2 && s.slice(i + 2, k).trim()) { flush(); out.push({ t: 'math', s: s.slice(i + 2, k), d: true, raw: s.slice(i, k + 2) }); i = k + 2; continue; }
          buf += '$$'; loose += 2; i += 2; continue;
        }
        var nx = s[i + 1];
        if (nx !== undefined && !isSpace(nx)) {
          var e = -1;
          for (var p = i + 1; p < n && p < i + 400; p++) {   // công thức trong dòng tối đa 400 ký tự (tránh dò quá lâu với dòng bất thường)
            var ch = s[p];
            if (ch === '\n') break;
            if (ch === '\\') { p++; continue; }
            if (ch === '$' && p > i + 1 && !isSpace(s[p - 1]) && !isDigit(s[p + 1] === undefined ? 'x' : s[p + 1])) { e = p; break; }
          }
          if (e > 0) { flush(); out.push({ t: 'math', s: s.slice(i + 1, e), d: false, raw: s.slice(i, e + 1) }); i = e + 1; continue; }
        }
        buf += '$'; loose++; i++; continue;
      }
      buf += c; i++;
    }
    flush();
    return { parts: out, loose: loose, hasMath: out.some(function (x) { return x.t === 'math'; }) };
  }
  function has(src) { var s = String(src == null ? '' : src); return (s.indexOf('$') >= 0 || s.indexOf('\\(') >= 0 || s.indexOf('\\[') >= 0) && split(s).hasMath; }

  /* Tải KaTeX (một lần, khi cần) */
  var loading = null;
  function ready() {
    if (root.katex) return Promise.resolve(root.katex);
    if (loading) return loading;
    loading = new Promise(function (res, rej) {
      if (!root.document) { rej(new Error('no-dom')); return; }
      var l = document.createElement('link'); l.rel = 'stylesheet'; l.href = BASE + 'katex.min.css'; document.head.appendChild(l);
      var s = document.createElement('script'); s.src = BASE + 'katex.min.js';
      s.onload = function () { if (root.katex) res(root.katex); else { loading = null; rej(new Error('katex')); } };
      s.onerror = function () { loading = null; rej(new Error('katex')); };
      document.head.appendChild(s);
    });
    return loading;
  }
  var SKIP = { SCRIPT: 1, STYLE: 1, TEXTAREA: 1, PRE: 1, CODE: 1, OPTION: 1, INPUT: 1, NOSCRIPT: 1 };
  function textNodes(el) {
    var list = [], w = document.createTreeWalker(el, NodeFilter.SHOW_TEXT, { acceptNode: function (n) {
      for (var p = n.parentNode; p && p !== el.parentNode; p = p.parentNode) { if (p.nodeType === 1 && (SKIP[p.tagName] || (p.classList && (p.classList.contains('katex') || p.classList.contains('tbl-math'))))) return NodeFilter.FILTER_REJECT; }
      return (n.nodeValue.indexOf('$') >= 0 || n.nodeValue.indexOf('\\(') >= 0 || n.nodeValue.indexOf('\\[') >= 0) ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_REJECT;
    } });
    while (w.nextNode()) list.push(w.currentNode);
    return list;
  }
  /* Hiển thị công thức trong một phần tử (hoặc danh sách phần tử). Không bao giờ ném lỗi. */
  function render(target) {
    var els = !target ? [] : (target.nodeType === 1 ? [target] : Array.prototype.slice.call(target));
    els = els.filter(function (e) { return e && e.nodeType === 1 && has(e.textContent); });
    if (!els.length) return Promise.resolve(0);
    return ready().then(function (katex) {
      var done = 0;
      els.forEach(function (el) {
        textNodes(el).forEach(function (node) {
          var sp = split(node.nodeValue); if (!sp.hasMath) { if (node.nodeValue.indexOf('\\$') >= 0) node.nodeValue = sp.parts.map(function (x) { return x.s; }).join(''); return; }
          var frag = document.createDocumentFragment();
          sp.parts.forEach(function (x) {
            if (x.t === 'text') { frag.appendChild(document.createTextNode(x.s)); return; }
            var span = document.createElement('span'); span.className = 'tbl-math' + (x.d ? ' tbl-math-display' : '');
            try { katex.render(x.s, span, Object.assign({ displayMode: !!x.d }, OPTS)); done++; } catch (e) { span.textContent = x.raw; }
            frag.appendChild(span);
          });
          node.parentNode.replaceChild(frag, node);
        });
      });
      return done;
    }).catch(function () { return 0; });
  }
  /* Kiểm tra trước khi đăng: trả { errors: [...], warnings: [...], count } (cần KaTeX; không có mạng thì chỉ báo cảnh báo dấu $ lẻ) */
  function check(src) {
    var s = String(src == null ? '' : src), sp = split(s), errors = [], warnings = [], math = sp.parts.filter(function (x) { return x.t === 'math'; });
    if (sp.loose > 0) warnings.push('Có dấu $ không thành cặp công thức (nếu là ký hiệu tiền thì viết \\$).');
    if (!math.length) return Promise.resolve({ errors: errors, warnings: warnings, count: 0 });
    return ready().then(function (katex) {
      math.forEach(function (m) {
        try { katex.renderToString(m.s, { displayMode: !!m.d, throwOnError: true, strict: 'ignore', trust: false, maxExpand: 1000 }); }
        catch (e) { errors.push('Công thức lỗi "' + (m.s.length > 40 ? m.s.slice(0, 40) + '...' : m.s) + '": ' + String(e && e.message || e).replace(/^KaTeX parse error:\s*/, '').slice(0, 120)); }
      });
      return { errors: errors, warnings: warnings, count: math.length };
    }, function () { warnings.push('Chưa tải được KaTeX nên chưa kiểm tra được cú pháp công thức.'); return { errors: errors, warnings: warnings, count: math.length }; });
  }
  return { split: split, has: has, render: render, check: check, ready: ready, VERSION: VER };
});
