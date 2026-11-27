/* Nhập nhiều đề thi một lần từ một tệp ZIP "bộ đề" (định dạng tbl-bo-de-1).
 *
 * Cấu trúc ZIP:
 *   bo-de.json            { "dinh_dang": "tbl-bo-de-1", "de": [ { "thu_muc", "ten", "ky_thi", "bang_de",
 *                            "loai", "thoi_gian_phut", "mo_ta" } ... ] }
 *   <thu_muc>/de.csv      cùng định dạng với ô "Nhập câu hỏi trực tiếp vào đề thi"
 *   <thu_muc>/**.png|jpg|webp   hình, khớp theo tên tệp ghi trong CSV
 *
 * Mỗi đề: tạo đề (Nháp) → thêm câu (Nháp) → tải hình → lưu đáp án → gắn câu vào đề
 * → (nếu chọn) đăng câu và đăng đề. Đề trùng tên với đề đã có thì bỏ qua.
 * Chỉ dùng các bảng/hàm mà Admin vẫn dùng khi nhập tay (không cần SQL mới).
 */
(function () {
  'use strict';
  var IMG_MAX = 5 * 1024 * 1024, MAX_ROWS = 100, MAX_DE = 60;
  var LOAI = ['thi_thu', 'luyen_de', 'kiem_tra_tuan'];

  function chuan(s) { return String(s == null ? '' : s).trim().toLowerCase().replace(/\s+/g, ' '); }
  function tenTep(name) { return String(name || '').trim().replace(/\\/g, '/').split('/').pop(); }

  // Giống eiCsvParse trong admin.html (dấu phẩy, nháy kép, bỏ BOM, tên cột chữ thường).
  function docCsv(txt) {
    txt = String(txt || '').replace(/^﻿/, '');
    var rows = [], cur = [], field = '', quote = false;
    for (var i = 0; i < txt.length; i++) {
      var c = txt[i];
      if (c === '"') { if (quote && txt[i + 1] === '"') { field += '"'; i++; } else quote = !quote; }
      else if (c === ',' && !quote) { cur.push(field); field = ''; }
      else if ((c === '\n' || c === '\r') && !quote) { cur.push(field); if (cur.some(function (x) { return x.trim(); })) rows.push(cur); cur = []; field = ''; if (c === '\r' && txt[i + 1] === '\n') i++; }
      else field += c;
    }
    if (quote) throw new Error('CSV có dấu nháy kép chưa đóng.');
    cur.push(field); if (cur.some(function (x) { return x.trim(); })) rows.push(cur);
    if (!rows.length) throw new Error('CSV trống.');
    var headers = rows.shift().map(function (x) { return x.trim().toLowerCase(); });
    if (new Set(headers).size !== headers.length) throw new Error('CSV có tên cột trùng nhau.');
    return rows.map(function (a, idx) {
      if (a.length !== headers.length) throw new Error('Dòng ' + (idx + 2) + ' lệch số cột.');
      var o = {}; headers.forEach(function (k, j) { o[k] = a[j].trim(); }); return o;
    });
  }

  // Cùng luật với eiValidate trong admin.html.
  function lapKeHoach(rows, files) {
    if (rows.length > MAX_ROWS) throw new Error('Một đề tối đa ' + MAX_ROWS + ' câu.');
    var seen = new Set(), plan = [];
    rows.forEach(function (r, i) {
      var code = (r.ma_cau || '').trim(), type = r.loai || 'tu_luan';
      if (!/^[a-zA-Z0-9_-]{1,50}$/.test(code)) throw new Error('Câu ' + (i + 1) + ': mã câu chỉ gồm A–Z, số, _, -; tối đa 50 ký tự.');
      if (seen.has(code)) throw new Error('Mã câu trùng: ' + code); seen.add(code);
      if (['trac_nghiem', 'tu_luan'].indexOf(type) < 0) throw new Error('Câu ' + code + ': loại không hợp lệ.');
      if (!(r.de_vi || r.de_en)) throw new Error('Câu ' + code + ': thiếu đề bài.');
      var ans = (r.dap_so || '').trim(); if (!ans) throw new Error('Câu ' + code + ': thiếu đáp số.');
      if (type === 'trac_nghiem') {
        if (!/^[A-E]$/i.test(ans)) throw new Error('Câu ' + code + ': đáp án trắc nghiệm phải là A–E.');
        var act = 'ABCDE'.split('').filter(function (k) { return !!(r[k.toLowerCase()] || r['hinh_' + k.toLowerCase()]); });
        if (act.length < 2) throw new Error('Câu ' + code + ': trắc nghiệm phải có ít nhất 2 phương án.');
        if (act.indexOf(ans.toUpperCase()) < 0) throw new Error('Câu ' + code + ': đáp án không thuộc các phương án đã khai báo.');
      }
      var imgs = [];
      ['hinh_de', 'hinh_a', 'hinh_b', 'hinh_c', 'hinh_d', 'hinh_e'].forEach(function (key) {
        var n = tenTep(r[key]); if (!n) return;
        if (!/\.(png|jpe?g|webp)$/i.test(n)) throw new Error('Câu ' + code + ': ảnh phải là PNG/JPG/WebP.');
        var f = files[n.toLowerCase()]; if (!f) throw new Error('Câu ' + code + ': không thấy hình ' + n + ' trong thư mục của đề.');
        imgs.push({ key: key, name: n, file: f });
      });
      var score = Number(r.diem || 1);
      if (!isFinite(score) || score <= 0 || score > 100) throw new Error('Câu ' + code + ': điểm không hợp lệ.');
      plan.push({ code: code, type: type, score: score, raw: r, imgs: imgs });
    });
    return plan;
  }

  /* Đọc và kiểm tra bộ đề. ctx = { exams:[{id,ma,ten}], levels:[{id,exam_id,ten}], papers:[{ten}] } */
  async function doc(zipFile, ctx) {
    if (!window.JSZip) throw new Error('Thư viện ZIP chưa tải xong, hãy thử lại sau vài giây.');
    var zip = await window.JSZip.loadAsync(zipFile);
    // Một số công cụ nén trên Windows ghi đường dẫn bằng "\": chuẩn hoá về "/".
    var entries = Object.keys(zip.files).filter(function (k) { return !zip.files[k].dir; }).map(function (k) { return { path: k.replace(/\\/g, '/'), file: zip.files[k] }; });
    var metaEntry = null;
    entries.forEach(function (e) { if (/(^|\/)bo-de\.json$/i.test(e.path) && (!metaEntry || e.path.length < metaEntry.path.length)) metaEntry = e; });
    if (!metaEntry) throw new Error('Trong ZIP không có tệp bo-de.json. Đây không phải gói "bộ đề".');
    var goc = metaEntry.path.replace(/bo-de\.json$/i, '');
    metaEntry = metaEntry.file;
    var meta;
    try { meta = JSON.parse((await metaEntry.async('string')).replace(/^﻿/, '')); } catch (e) { throw new Error('bo-de.json không đọc được: ' + e.message); }
    if (!meta || meta.dinh_dang !== 'tbl-bo-de-1' || !Array.isArray(meta.de)) throw new Error('bo-de.json sai định dạng (cần "dinh_dang": "tbl-bo-de-1" và danh sách "de").');
    if (!meta.de.length) throw new Error('Bộ đề không có đề nào.');
    if (meta.de.length > MAX_DE) throw new Error('Mỗi bộ tối đa ' + MAX_DE + ' đề.');
    var daCo = new Set((ctx.papers || []).map(function (p) { return chuan(p.ten); }));
    var tenTrongBo = new Set(), out = [];
    for (var i = 0; i < meta.de.length; i++) {
      var m = meta.de[i] || {}, item = { stt: i + 1, ten: String(m.ten || '').trim(), thu_muc: String(m.thu_muc || '').trim(), loi: null, boQua: null };
      out.push(item);
      try {
        if (!item.ten) throw new Error('thiếu tên đề');
        if (!item.thu_muc || /(^|\/)\.\.(\/|$)/.test(item.thu_muc)) throw new Error('thiếu hoặc sai "thu_muc"');
        if (tenTrongBo.has(chuan(item.ten))) throw new Error('tên đề bị lặp trong bộ'); tenTrongBo.add(chuan(item.ten));
        if (daCo.has(chuan(item.ten))) { item.boQua = 'đã có đề cùng tên trên trang'; continue; }
        var ex = (ctx.exams || []).find(function (e) { return chuan(e.ma) === chuan(m.ky_thi) || chuan(e.ten) === chuan(m.ky_thi); });
        if (!ex) throw new Error('không thấy kỳ thi "' + (m.ky_thi || '') + '"');
        var lv = null;
        if (m.bang_de) {
          lv = (ctx.levels || []).find(function (l) { return l.exam_id === ex.id && chuan(l.ten) === chuan(m.bang_de); });
          if (!lv) throw new Error('kỳ thi ' + ex.ten + ' chưa có bảng đề "' + m.bang_de + '"');
        }
        var loai = m.loai || 'luyen_de'; if (LOAI.indexOf(loai) < 0) throw new Error('loại đề "' + loai + '" không hợp lệ');
        var phut = Number(m.thoi_gian_phut); if (!(phut >= 1 && phut <= 600)) throw new Error('thời gian làm bài phải từ 1 đến 600 phút');
        var prefix = (goc + item.thu_muc.replace(/\\/g, '/').replace(/\/+$/, '') + '/').toLowerCase(), files = {}, csvEntry = null;
        entries.forEach(function (en) {
          var k = en.path, e = en.file; if (k.toLowerCase().indexOf(prefix) !== 0) return;
          var rest = k.slice(prefix.length);
          if (rest.toLowerCase() === 'de.csv') { csvEntry = e; return; }
          var n = tenTep(rest).toLowerCase(); if (!/\.(png|jpe?g|webp)$/.test(n)) return;
          if (files[n]) throw new Error('hai hình trùng tên ' + n);
          files[n] = e;
        });
        if (!csvEntry) throw new Error('thư mục "' + item.thu_muc + '" không có de.csv');
        var plan = lapKeHoach(docCsv(await csvEntry.async('string')), files);
        item.row = { ten: item.ten, loai: loai, exam_id: ex.id, level_id: lv ? lv.id : null, thoi_gian_phut: Math.round(phut), thu_tu: Number(m.thu_tu) || 0, mo_ta: m.mo_ta ? String(m.mo_ta) : null };
        item.pham_vi = ex.ten + (lv ? ' › ' + lv.ten : '');
        item.plan = plan;
        item.so_hinh = plan.reduce(function (s, x) { return s + x.imgs.length; }, 0);
        item.tong_diem = plan.reduce(function (s, x) { return s + x.score; }, 0);
      } catch (e) { item.loi = e.message || String(e); }
    }
    return out;
  }

  function loiChu(e) { return (e && (e.message || e.details || e.hint)) || String(e); }

  /* Nhập các đề hợp lệ. opts = { sb, quyen, dang, log(msg) } → [{ten, ket_qua, loi}] */
  async function nhap(items, opts) {
    var sb = opts.sb, log = opts.log || function () {}, kq = [];
    var viec = items.filter(function (x) { return !x.loi && !x.boQua; });
    for (var d = 0; d < viec.length; d++) {
      var it = viec[d], paperId = null, created = [];
      log('(' + (d + 1) + '/' + viec.length + ') ' + it.ten + ': đang tạo đề…');
      try {
        var row = Object.assign({}, it.row, { access_level: opts.quyen, trang_thai: 'nhap' });
        var ins = await sb.from('papers').insert(row).select('id').single();
        if (ins.error) throw ins.error;
        paperId = ins.data.id;
        for (var i = 0; i < it.plan.length; i++) {
          var item = it.plan[i], r = item.raw, opt = null;
          if (i % 5 === 0) log('(' + (d + 1) + '/' + viec.length + ') ' + it.ten + ': câu ' + (i + 1) + '/' + it.plan.length);
          if (item.type === 'trac_nghiem') opt = 'ABCDE'.split('').filter(function (L) { var k = L.toLowerCase(); return !!(r[k] || r['hinh_' + k]); }).map(function (L) { return { key: L, text: r[L.toLowerCase()] || '', image: '' }; });
          var p = await sb.from('problems').insert({ topic_id: null, so_thu_tu: i + 1, de_vi: r.de_vi || null, de_en: r.de_en || null, diem: Math.ceil(item.score), nguon: r.nguon || null, ma_cu: 'DE-' + paperId.slice(0, 8) + '-' + item.code, trang_thai: 'nhap', loai: item.type, phuong_an: opt }).select('id').single();
          if (p.error) throw p.error;
          var pid = p.data.id; created.push({ id: pid, score: item.score });
          for (var z = 0; z < item.imgs.length; z++) {
            var a = item.imgs[z], bytes = await a.file.async('uint8array');
            if (bytes.length > IMG_MAX) throw new Error('Ảnh ' + a.name + ' vượt 5 MB.');
            var ext = a.name.split('.').pop().toLowerCase(); if (ext === 'jpeg') ext = 'jpg';
            var path = pid + '/' + a.key + '.' + ext, mime = ext === 'jpg' ? 'image/jpeg' : 'image/' + ext;
            var up = await sb.storage.from('hinh-cau-hoi').upload(path, new Blob([bytes], { type: mime }), { contentType: mime, upsert: false });
            if (up.error) throw up.error;
            if (a.key === 'hinh_de') { var hs = await sb.from('problems').update({ hinh_anh: path }).eq('id', pid); if (hs.error) throw hs.error; }
            else { var L = a.key.slice(-1).toUpperCase(); opt.find(function (x) { return x.key === L; }).image = path; }
          }
          if (opt && item.imgs.some(function (a) { return a.key !== 'hinh_de'; })) { var op = await sb.from('problems').update({ phuong_an: opt }).eq('id', pid); if (op.error) throw op.error; }
          var sol = await sb.from('problem_solutions').upsert({ problem_id: pid, dap_so: item.type === 'trac_nghiem' ? r.dap_so.toUpperCase() : r.dap_so, loi_giai: r.loi_giai || null, goi_y_1: r.goi_y_1 || null, goi_y_2: r.goi_y_2 || null }, { onConflict: 'problem_id' });
          if (sol.error) throw sol.error;
        }
        var saved = await sb.rpc('admin_save_paper_items', { p_paper: paperId, p_items: created.map(function (x) { return { problem_id: x.id, diem: x.score }; }) });
        if (saved.error) throw saved.error;
        if (opts.dang) {
          log('(' + (d + 1) + '/' + viec.length + ') ' + it.ten + ': đang đăng…');
          var ids = created.map(function (x) { return x.id; });
          var pub = await sb.from('problems').update({ trang_thai: 'da_dang' }).in('id', ids).eq('trang_thai', 'nhap').select('id');
          if (pub.error) throw pub.error;
          if (!pub.data || pub.data.length !== ids.length) throw new Error('chỉ đăng được ' + (pub.data ? pub.data.length : 0) + '/' + ids.length + ' câu');
          var pp = await sb.from('papers').update({ trang_thai: 'da_dang' }).eq('id', paperId);
          if (pp.error) throw pp.error;
        }
        kq.push({ ten: it.ten, ok: true, so_cau: created.length });
        log('(' + (d + 1) + '/' + viec.length + ') ' + it.ten + ': xong, ' + created.length + ' câu' + (opts.dang ? ', đã đăng.' : ', để Nháp.'));
      } catch (e) {
        var msg = loiChu(e), ghi = '';
        if (paperId) {
          // Đổi tên đề dở dang để lần nhập lại không bị coi là "đã có" và để dễ nhận ra trong danh sách.
          var tenLoi = '[Lỗi nhập] ' + it.ten;
          try { var rn = await sb.from('papers').update({ ten: tenLoi }).eq('id', paperId); ghi = rn.error ? ' Đề dở dang vẫn tên cũ, ở trạng thái Nháp.' : ' Đề dở dang được đổi tên thành "' + tenLoi + '" (Nháp, ' + created.length + ' câu); có thể nhập lại bộ.'; } catch (e2) { ghi = ' Đề dở dang vẫn ở trạng thái Nháp.'; }
        }
        kq.push({ ten: it.ten, ok: false, loi: msg, paperId: paperId, so_cau_da_tao: created.length });
        log('(' + (d + 1) + '/' + viec.length + ') ' + it.ten + ': LỖI – ' + msg + '.' + ghi);
      }
    }
    return kq;
  }

  window.TBLBoDe = { doc: doc, nhap: nhap, _docCsv: docCsv, _lapKeHoach: lapKeHoach };
})();
