function formatDate(dateObj) {
  if (!dateObj || !dateObj.full_date) return '';
  const { full_date, month_known, day_known, date_variant, time } = dateObj;

  const [year, month, day] = full_date.split('-');
  const date = new Date(`${year}-${month || '01'}-01`);
  const monthName = date.toLocaleString('default', { month: 'long' });

  let formatted = '';
  if (day_known) {
    formatted = new Date(full_date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  } else if (month_known) {
    formatted = `${monthName}, ${year}`;
  } else {
    formatted = year;
  }

  if (date_variant) {
    formatted += ` (${date_variant})`;
  }

  if (time === 'matinee') {
    formatted += ` (matinee)`;
  }

  return formatted;
}

function updateSelectionSummary(dataMap) {
  const container = document.getElementById('selectionSummary');
  if (dataMap.size === 0) {
    container.innerText = '';
    return;
  }

  const summary = Array.from(dataMap.values()).map(row => {
    const btn = row.querySelector('.copy-btn');
    const id = btn?.dataset.id || 'ne';

    if (id === 'ne') {
      const folder = btn?.dataset.folder || '(unknown folder)';
      return `[ne] ${folder}`;
    }

    const show = btn?.dataset.show || '';
    const tour = btn?.dataset.tour || '';
    const date = btn?.dataset.date || '';
    const master = btn?.dataset.master || '';
    return `[${id}] ${show} - ${tour} - ${date} - ${master}`;
  });

  container.innerText = summary.join('\n');
}


fetch('data/collection.json')
  .then(res => res.json())
  .then(data => {
    const tableBody = document.querySelector('#collectionTable tbody');
    const searchInput = document.getElementById('searchInput');
    const selectedLinks = new Map();

    function renderTable(filter = '') {
      tableBody.innerHTML = '';

      const sorted = [...data].sort((a, b) => {
        const ra = a.recording || {};
        const rb = b.recording || {};

        const isAEncora = !!ra.id;
        const isBEncora = !!rb.id;

        if (!isAEncora && isBEncora) return 1;
        if (isAEncora && !isBEncora) return -1;

        const showA = (ra.show || '').toLowerCase();
        const showB = (rb.show || '').toLowerCase();
        if (showA !== showB) return showA.localeCompare(showB);

        const tourA = (ra.tour || '').toLowerCase();
        const tourB = (rb.tour || '').toLowerCase();
        if (tourA !== tourB) return tourA.localeCompare(tourB);

        const dateA = ra.date?.full_date || '';
        const dateB = rb.date?.full_date || '';
        if (dateA !== dateB) return dateA.localeCompare(dateB);

        const variantA = ra.date?.date_variant || '';
        const variantB = rb.date?.date_variant || '';
        if (variantA !== variantB) return variantA.localeCompare(variantB);

        const masterA = (ra.master || '').toLowerCase();
        const masterB = (rb.master || '').toLowerCase();
        if (masterA !== masterB) return masterA.localeCompare(masterB);

        const idA = ra.id || 0;
        const idB = rb.id || 0;
        return idA - idB;
      });

      sorted.forEach(entry => {
        const recording = entry.recording;
        const id = recording?.id || '';
        const show = recording?.show || '';
        const tour = recording?.tour || '';
        const date = formatDate(recording?.date);
        const master = recording?.master || '';
        const link = entry.share_link || '';
        const source = entry.source_path || '';
        const folder = entry.source_folder || '';

        const isEncora = Boolean(id);
        const displayText = [id, show, tour, date, master, link, source].join(' ').toLowerCase();

        if (!displayText.includes(filter.toLowerCase())) return;

        const row = document.createElement('tr');
        const uniqueKey = id || source;

        if (!recording) {
          row.innerHTML = `
            <td><input type="checkbox" class="row-select" data-key="${uniqueKey}"></td>
            <td colspan="4" class="fst-italic text-muted">${source}</td>
            <td></td>
            <td>
              <button class="btn btn-primary btn-sm copy-btn" 
                data-link="${link}"
                data-folder="${folder}"
                data-id="ne">
                <i class="fas fa-copy"></i>
              </button>
            </td>
          `;
        } else {
          row.innerHTML = `
            <td><input type="checkbox" class="row-select" data-key="${uniqueKey}" ${selectedLinks.has(uniqueKey) ? 'checked' : ''}></td>
            <td>${show}</td>
            <td>${tour}</td>
            <td>${date}</td>
            <td>${master}</td>
            <td>
              <a href="https://encora.it/recordings/${id}" target="_blank" class="encora-button btn btn-outline-light btn-sm shadow-sm">
                <img src="img/encora.png" alt="Encora" style="width:20px; height:20px;" />
              </a>
            </td>
            <td>
              <button class="btn btn-primary btn-sm copy-btn" 
                data-link="${link}"
                data-show="${show}"
                data-tour="${tour}"
                data-date="${date}"
                data-master="${master}"
                data-id="${id}">
                <i class="fas fa-copy"></i>
              </button>
            </td>
          `;
        }

        tableBody.appendChild(row);
      });

      document.querySelectorAll('.row-select').forEach(cb => {
        cb.addEventListener('change', function () {
          const key = this.dataset.key;
          if (this.checked) {
            const row = this.closest('tr');
            selectedLinks.set(key, row);
          } else {
            selectedLinks.delete(key);
          }
          updateSelectionSummary(selectedLinks);
        });
      });

      document.querySelectorAll('.copy-btn').forEach(btn => {
        btn.addEventListener('click', () => {
          const id = btn.dataset.id;
          let text = '';
          if (id === 'ne') {
            const folder = btn.dataset.folder;
            const link = btn.dataset.link;
            text = `${folder}\n${link}`;
          } else {
            const show = btn.dataset.show;
            const tour = btn.dataset.tour;
            const date = btn.dataset.date;
            const master = btn.dataset.master;
            const link = btn.dataset.link;
            const encoraLink = `https://encora.it/recordings/${id}`;
            text = `${show} - ${tour}\n${date} - ${master}\n${link}\n${encoraLink}`;
          }

          navigator.clipboard.writeText(text).then(() => {
            btn.innerHTML = "<i class='fas fa-check'></i>";
            btn.classList.add('copied');
            setTimeout(() => {
              btn.innerHTML = "<i class='fas fa-copy'></i>";
              btn.classList.remove('copied');
            }, 1500);
          });
        });
      });

      updateSelectionSummary(selectedLinks);
    }

    document.getElementById('selectAll').addEventListener('change', function () {
      const checked = this.checked;
      document.querySelectorAll('.row-select').forEach(cb => {
        cb.checked = checked;
        const key = cb.dataset.key;
        if (checked) {
          const row = cb.closest('tr');
          selectedLinks.set(key, row);
        } else {
          selectedLinks.delete(key);
        }
      });
      updateSelectionSummary(selectedLinks);
    });

    document.getElementById('copySelectedBtn').addEventListener('click', () => {
      const lines = Array.from(selectedLinks.values()).map(row => {
        const btn = row.querySelector('.copy-btn');
        const id = btn?.dataset.id;
        if (id === 'ne') {
          const folder = btn.dataset.folder;
          const link = btn.dataset.link;
          return `${folder}\n${link}`;
        } else {
          const show = btn.dataset.show;
          const tour = btn.dataset.tour;
          const date = btn.dataset.date;
          const master = btn.dataset.master;
          const link = btn.dataset.link;
          const encoraLink = `https://encora.it/recordings/${id}`;
          return `${show} - ${tour}\n${date} - ${master}\n${link}\n${encoraLink}`;
        }
      });

      const text = lines.join('\n\n');

      navigator.clipboard.writeText(text).then(() => {
        const btn = document.getElementById('copySelectedBtn');
        btn.innerText = 'Copied!';
        setTimeout(() => {
          btn.innerText = 'Copy Selected';
        }, 1500);
      });
    });

    searchInput.addEventListener('input', e => {
      renderTable(e.target.value);
    });

    renderTable();
  });
