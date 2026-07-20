// src/app.js
// Main application controller handling catalog filters, tabs, stats calculations, and LocalStorage sync.
// Created: 2026-07-20

// State variables holding loaded list items
let listState = {
  activeList: '286',
  '286': [],
  gcp: [],
  clover: []
};

// Elements cache
const el = {
  tab286: document.getElementById('tab-286'),
  tabGcp: document.getElementById('tab-gcp'),
  tabClover: document.getElementById('tab-clover'),
  
  statTotal: document.getElementById('stat-total'),
  statCompleted: document.getElementById('stat-completed'),
  statPending: document.getElementById('stat-pending'),
  progressRing: document.getElementById('progress-indicator'),
  progressPercent: document.getElementById('progress-percent'),
  progressText: document.getElementById('stat-percentage-text'),
  
  searchInput: document.getElementById('search-input'),
  categoryFilter: document.getElementById('category-filter'),
  statusFilter: document.getElementById('status-filter'),
  
  catalogListing: document.getElementById('catalog-listing'),
  catalogEmpty: document.getElementById('catalog-empty'),
  btnResetFilters: document.getElementById('btn-reset-filters'),
  
  detailsModal: document.getElementById('details-modal'),
  modalClose: document.getElementById('modal-close'),
  modalProjectId: document.getElementById('modal-project-id'),
  modalProjectTitle: document.getElementById('modal-project-title'),
  modalProjectDesc: document.getElementById('modal-project-desc'),
  modalProjectCategory: document.getElementById('modal-project-category'),
  modalProjectTech: document.getElementById('modal-project-tech'),
  modalProjectStatus: document.getElementById('modal-project-status'),
  modalProjectDate: document.getElementById('modal-project-date'),
  modalDateRow: document.getElementById('modal-date-row'),
  modalGithubLink: document.getElementById('modal-github-link'),
  modalResumeTag: document.getElementById('modal-resume-tag'),
  modalResumeId: document.getElementById('modal-resume-id'),
  modalProjectNotes: document.getElementById('modal-project-notes'),
  btnSaveModal: document.getElementById('btn-save-modal')
};

// Variable holding currently edited modal project reference
let currentEditingProject = null;

// Initialize app on DOM Load
window.addEventListener('DOMContentLoaded', () => {
  setupEventListeners();
  loadAllLists();
});

// Configure event listener bindings
function setupEventListeners() {
  // Tabs events
  const tabs = [el.tab286, el.tabGcp, el.tabClover];
  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      tabs.forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      switchList(tab.dataset.list);
    });
  });

  // Filter query inputs
  el.searchInput.addEventListener('input', applyFilters);
  el.categoryFilter.addEventListener('change', applyFilters);
  el.statusFilter.addEventListener('change', applyFilters);
  el.btnResetFilters.addEventListener('click', resetFilters);

  // Focus search input on "/" keydown
  window.addEventListener('keydown', (event) => {
    if (event.key === '/' && document.activeElement !== el.searchInput) {
      event.preventDefault();
      el.searchInput.focus();
    }
  });

  // Modal events
  el.modalClose.addEventListener('click', closeModal);
  el.btnSaveModal.addEventListener('click', saveModalEdits);
  
  // Close modal on click outside content body
  el.detailsModal.addEventListener('click', (event) => {
    if (event.target === el.detailsModal) {
      closeModal();
    }
  });
}

// Fetch lists datasets from JSON files or restore from LocalStorage
async function loadAllLists() {
  const fetchList = async (key, jsonFile) => {
    const cached = localStorage.getItem(`tracker_${key}_list`);
    if (cached) {
      try {
        return JSON.parse(cached);
      } catch (e) {
        console.error(`Failed to parse cached ${key} list:`, e);
      }
    }
    
    try {
      const response = await fetch(`src/data/${jsonFile}`);
      const data = await response.json();
      return data;
    } catch (e) {
      console.error(`Failed to load ${jsonFile}:`, e);
      return [];
    }
  };

  listState['286'] = await fetchList('286', 'projects_286.json');
  listState.gcp = await fetchList('gcp', 'projects_gcp.json');
  listState.clover = await fetchList('clover', 'projects_clover.json');

  switchList('286');
}

// Switches workspace lists
function switchList(listKey) {
  listState.activeList = listKey;
  
  // Populate category options
  populateCategoriesFilter();
  
  // Reset filters value
  el.searchInput.value = '';
  el.statusFilter.value = 'All';
  
  applyFilters();
}

// Extracts unique category labels to filter select options
function populateCategoriesFilter() {
  const projects = listState[listState.activeList];
  const uniqueCategories = [...new Set(projects.map(p => p.category).filter(Boolean))].sort();
  
  // Keep first default option
  el.categoryFilter.innerHTML = '<option value="All">All Categories</option>';
  
  uniqueCategories.forEach(cat => {
    const opt = document.createElement('option');
    opt.value = cat;
    opt.textContent = cat;
    el.categoryFilter.appendChild(opt);
  });
}

// Recalculates stats panel progress values
function updateStatsPanel(filteredProjects) {
  const activeKey = listState.activeList;
  const allProjects = listState[activeKey];
  
  const total = allProjects.length;
  const completed = allProjects.filter(p => p.status === 'Done').length;
  const inProgress = allProjects.filter(p => p.status === 'In Progress').length;
  
  el.statTotal.textContent = total;
  el.statCompleted.textContent = completed;
  el.statPending.textContent = inProgress;
  
  const percentage = total > 0 ? Math.round((completed / total) * 100) : 0;
  el.progressPercent.textContent = `${percentage}%`;
  el.progressText.textContent = `${completed} of ${total} done`;
  
  // Update circular svg outline dash offsets
  const radius = 32;
  const circumference = 2 * Math.PI * radius; // ~201.06
  el.progressRing.style.strokeDasharray = circumference;
  
  const offset = circumference - (percentage / 100) * circumference;
  el.progressRing.style.strokeDashoffset = offset;
}

// Dynamic filtration rules matching keywords and tags
function applyFilters() {
  const query = el.searchInput.value.trim().toLowerCase();
  const category = el.categoryFilter.value;
  const status = el.statusFilter.value;
  
  const projects = listState[listState.activeList];
  
  const filtered = projects.filter(project => {
    // 1. Matches Search query
    const matchQuery = !query || 
      String(project.id).includes(query) ||
      (project.description && project.description.toLowerCase().includes(query)) ||
      (project.title && project.title.toLowerCase().includes(query)) ||
      (project.technology && project.technology.toLowerCase().includes(query)) ||
      (project.notes && project.notes.toLowerCase().includes(query));
      
    // 2. Matches Category tag
    const matchCategory = category === 'All' || project.category === category;
    
    // 3. Matches Status tag
    const matchStatus = status === 'All' || project.status === status;
    
    return matchQuery && matchCategory && matchStatus;
  });
  
  // Update stats counters
  updateStatsPanel(filtered);
  
  // Render cards lists
  renderCatalogCards(filtered);
}

// Reset all search and selector filters
function resetFilters() {
  el.searchInput.value = '';
  el.categoryFilter.value = 'All';
  el.statusFilter.value = 'All';
  applyFilters();
}

// Renders filtered cards lists dynamically
function renderCatalogCards(filteredList) {
  el.catalogListing.innerHTML = '';
  
  if (filteredList.length === 0) {
    el.catalogListing.classList.add('hidden');
    el.catalogEmpty.classList.remove('hidden');
    return;
  }
  
  el.catalogListing.classList.remove('hidden');
  el.catalogEmpty.classList.add('hidden');
  
  filteredList.forEach(project => {
    const card = document.createElement('div');
    const statusClass = project.status.replace(/\s+/g, '').toLowerCase();
    card.className = `project-card status-${statusClass} shadow-sm`;
    
    // Construct Tag Pills
    let tagHtml = '';
    if (project.category) tagHtml += `<span class="tag-pill">${project.category}</span>`;
    if (project.technology) {
      // Split comma lists if present
      const techs = project.technology.split(',').map(t => t.trim());
      techs.forEach(t => {
        if (t) tagHtml += `<span class="tag-pill">${t}</span>`;
      });
    }
    
    // Check if project is done
    const isDone = project.status === 'Done';
    const titleText = project.title || project.description;
    
    card.innerHTML = `
      <div class="card-header-row">
        <span class="build-id">Build #${project.id}</span>
        <span class="status-badge ${statusClass}">${project.status}</span>
      </div>
      <div class="card-body">
        <h3 class="project-desc-text">${titleText}</h3>
        <div class="project-tags-row">
          ${tagHtml}
        </div>
      </div>
      <div class="card-footer">
        <button class="btn-checkbox-toggle ${isDone ? 'done' : ''}" data-id="${project.id}">
          <span class="checkbox-visual">✓</span>
          <span class="checkbox-label-text">${isDone ? 'Done' : 'Mark Done'}</span>
        </button>
        <button class="btn-card-action" data-id="${project.id}">Details ➔</button>
      </div>
    `;
    
    // Bind Details click on card body (excluding checkout action triggers)
    card.addEventListener('click', (event) => {
      const isCheckboxClick = event.target.closest('.btn-checkbox-toggle');
      if (!isCheckboxClick) {
        openModal(project);
      }
    });
    
    // Bind toggle state checkmark listener
    const checkboxToggle = card.querySelector('.btn-checkbox-toggle');
    checkboxToggle.addEventListener('click', (event) => {
      event.stopPropagation(); // Avoid opening details modal
      toggleProjectStatus(project.id);
    });
    
    el.catalogListing.appendChild(card);
  });
}

// Toggles project completion done check status
function toggleProjectStatus(projectId) {
  const activeKey = listState.activeList;
  const list = listState[activeKey];
  const project = list.find(p => p.id === projectId);
  
  if (project) {
    if (project.status === 'Done') {
      project.status = 'Not Started';
      project.datePushed = '';
    } else {
      project.status = 'Done';
      // Set current ISO date
      project.datePushed = new Date().toISOString().split('T')[0];
    }
    
    saveCurrentListState();
    applyFilters();
  }
}

// Saves current list state to LocalStorage
function saveCurrentListState() {
  const activeKey = listState.activeList;
  localStorage.setItem(`tracker_${activeKey}_list`, JSON.stringify(listState[activeKey]));
}

// Opens details modal window
function openModal(project) {
  currentEditingProject = project;
  
  el.modalProjectId.textContent = `Build #${project.id}`;
  el.modalProjectTitle.textContent = project.title || `Build #${project.id}`;
  el.modalProjectDesc.textContent = project.description || 'No description provided.';
  el.modalProjectCategory.textContent = project.category || '—';
  el.modalProjectTech.textContent = project.technology || '—';
  el.modalProjectStatus.value = project.status;
  
  // Completion date check
  if (project.status === 'Done' && project.datePushed) {
    el.modalDateRow.classList.remove('hidden');
    el.modalProjectDate.textContent = project.datePushed;
  } else {
    el.modalDateRow.classList.add('hidden');
  }
  
  // GitHub repo link check
  if (project.githubLink) {
    el.modalGithubLink.href = project.githubLink.startsWith('http') ? project.githubLink : `https://github.com/${project.githubLink}`;
    el.modalGithubLink.classList.remove('hidden');
  } else {
    el.modalGithubLink.classList.add('hidden');
  }
  
  // Codex Resume ID checks
  if (project.codexResumeId) {
    el.modalResumeId.textContent = project.codexResumeId;
    el.modalResumeTag.classList.remove('hidden');
  } else {
    el.modalResumeTag.classList.add('hidden');
  }
  
  // Notes fields values
  el.modalProjectNotes.value = project.notes || '';
  
  // Display modal
  el.detailsModal.classList.remove('hidden');
}

// Closes details modal window
function closeModal() {
  el.detailsModal.classList.add('hidden');
  currentEditingProject = null;
}

// Saves edited values inside the Modal window
function saveModalEdits() {
  if (!currentEditingProject) return;
  
  const status = el.modalProjectStatus.value;
  const notes = el.modalProjectNotes.value.trim();
  
  currentEditingProject.status = status;
  currentEditingProject.notes = notes;
  
  // If status changed to Done and date is missing, set current date
  if (status === 'Done' && !currentEditingProject.datePushed) {
    currentEditingProject.datePushed = new Date().toISOString().split('T')[0];
  } else if (status !== 'Done') {
    currentEditingProject.datePushed = '';
  }
  
  saveCurrentListState();
  applyFilters();
  closeModal();
}
