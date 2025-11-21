// JL Solutions Academy - Progress Tracker with Local Storage
// Saves Sierra's progress locally in her browser

class ProgressTracker {
  constructor() {
    this.storageKey = 'jl-academy-progress';
    this.progress = this.loadProgress();
    this.init();
  }

  // Load progress from localStorage
  loadProgress() {
    const saved = localStorage.getItem(this.storageKey);
    return saved ? JSON.parse(saved) : {
      skills: {},
      projects: {},
      tools: {}
    };
  }

  // Save progress to localStorage
  saveProgress() {
    localStorage.setItem(this.storageKey, JSON.stringify(this.progress));
    this.updateUI();
  }

  // Initialize the tracker
  init() {
    this.attachEventListeners();
    this.restoreCheckboxes();
    this.updateUI();
  }

  // Attach click handlers to all checklist items
  attachEventListeners() {
    document.querySelectorAll('.checklist-item').forEach(item => {
      item.addEventListener('click', (e) => {
        e.preventDefault();
        this.toggleItem(item);
      });
    });
  }

  // Toggle item completion
  toggleItem(item) {
    const itemId = this.getItemId(item);
    const category = item.closest('.progress-section').dataset.category || 'general';
    
    // Toggle completed state
    item.classList.toggle('completed');
    
    // Update progress data
    if (!this.progress[category]) {
      this.progress[category] = {};
    }
    this.progress[category][itemId] = item.classList.contains('completed');
    
    // Save and update UI
    this.saveProgress();
    
    // Show celebration for milestones
    this.checkMilestones(item);
  }

  // Generate unique ID for checklist item
  getItemId(item) {
    const text = item.textContent.trim();
    return text.toLowerCase().replace(/[^a-z0-9]+/g, '-');
  }

  // Restore checkbox states from saved progress
  restoreCheckboxes() {
    document.querySelectorAll('.checklist-item').forEach(item => {
      const itemId = this.getItemId(item);
      const category = item.closest('.progress-section').dataset.category || 'general';
      
      if (this.progress[category] && this.progress[category][itemId]) {
        item.classList.add('completed');
      }
    });
  }

  // Update all UI elements (percentages, counts, etc.)
  updateUI() {
    this.updateOverallProgress();
    this.updateSkillProgress();
    this.updateProjectCounts();
    this.updateToolsCount();
    this.updateMilestones();
  }

  // Calculate and update overall progress
  updateOverallProgress() {
    const totalItems = document.querySelectorAll('.checklist-item').length;
    const completedItems = document.querySelectorAll('.checklist-item.completed').length;
    const percentage = totalItems > 0 ? Math.round((completedItems / totalItems) * 100) : 0;
    
    const percentageEl = document.querySelector('.progress-percentage');
    const progressBar = document.querySelector('.progress-bar-fill');
    
    if (percentageEl) {
      percentageEl.textContent = `${percentage}%`;
    }
    
    if (progressBar) {
      progressBar.style.width = `${percentage}%`;
    }
  }

  // Update individual skill progress bars
  updateSkillProgress() {
    document.querySelectorAll('.progress-section[data-category]').forEach(section => {
      const category = section.dataset.category;
      const items = section.querySelectorAll('.checklist-item');
      const completed = section.querySelectorAll('.checklist-item.completed');
      
      const percentage = items.length > 0 ? Math.round((completed.length / items.length) * 100) : 0;
      
      const progressBar = section.querySelector('.progress-bar-fill');
      const statusEl = section.querySelector('.skill-status');
      
      if (progressBar) {
        progressBar.style.width = `${percentage}%`;
      }
      
      if (statusEl) {
        if (percentage === 0) {
          statusEl.textContent = 'Not Started';
        } else if (percentage === 100) {
          statusEl.textContent = 'Completed! 🎉';
          statusEl.style.color = '#00C853';
        } else {
          statusEl.textContent = `${percentage}% Complete`;
          statusEl.style.color = '#0078D4';
        }
      }
    });
  }

  // Update project completion counts
  updateProjectCounts() {
    const projectSections = [
      { selector: '.progress-section h3', text: '🌱 Beginner Projects', total: 6 },
      { selector: '.progress-section h3', text: '🚀 Intermediate Projects', total: 6 },
      { selector: '.progress-section h3', text: '⚡ Advanced Projects', total: 4 }
    ];

    projectSections.forEach(section => {
      const heading = Array.from(document.querySelectorAll(section.selector))
        .find(h => h.textContent.includes(section.text));
      
      if (heading) {
        const container = heading.closest('.progress-section');
        const completed = container.querySelectorAll('.checklist-item.completed').length;
        heading.textContent = heading.textContent.replace(/\(\d+\/\d+\)/, `(${completed}/${section.total})`);
      }
    });
  }

  // Update tools count
  updateToolsCount() {
    const toolsHeading = Array.from(document.querySelectorAll('.progress-section h3'))
      .find(h => h.textContent.includes('🛠️ Essential Tools'));
    
    if (toolsHeading) {
      const container = toolsHeading.closest('.progress-section');
      const completed = container.querySelectorAll('.checklist-item.completed').length;
      const total = container.querySelectorAll('.checklist-item').length;
      toolsHeading.textContent = toolsHeading.textContent.replace(/\(\d+\/\d+\)/, `(${completed}/${total})`);
    }
  }

  // Update milestone badges
  updateMilestones() {
    const milestones = [
      { 
        name: 'First Week',
        condition: () => this.hasCompletedAny('.progress-section[data-category="html"]')
      },
      { 
        name: 'Styled',
        condition: () => this.hasCompletedAny('.progress-section[data-category="css"]')
      },
      { 
        name: 'Interactive',
        condition: () => this.hasCompletedAny('.progress-section[data-category="javascript"]')
      },
      { 
        name: 'Connected',
        condition: () => this.hasCompletedAny('.progress-section[data-category="apis"]')
      },
      { 
        name: 'Modern Dev',
        condition: () => this.hasCompletedAny('.progress-section[data-category="react"]')
      },
      { 
        name: 'Deployed',
        condition: () => this.hasCompletedItem('deploy a project to netlify/vercel')
      },
      { 
        name: 'Portfolio Ready',
        condition: () => this.countCompletedProjects() >= 6
      },
      { 
        name: 'Junior Dev',
        condition: () => this.getOverallPercentage() === 100
      }
    ];

    milestones.forEach(milestone => {
      const card = Array.from(document.querySelectorAll('.project-card'))
        .find(card => card.querySelector('h5')?.textContent === milestone.name);
      
      if (card && milestone.condition()) {
        const badge = card.querySelector('.tech-tag');
        if (badge) {
          badge.textContent = 'Unlocked! 🎉';
          badge.style.background = 'linear-gradient(135deg, #00C853, #00a043)';
          badge.style.color = 'white';
          card.style.borderColor = '#00C853';
        }
      }
    });
  }

  // Helper functions for milestones
  hasCompletedAny(selector) {
    const section = document.querySelector(selector);
    return section && section.querySelectorAll('.checklist-item.completed').length > 0;
  }

  hasCompletedItem(text) {
    const items = Array.from(document.querySelectorAll('.checklist-item'));
    return items.some(item => 
      item.textContent.toLowerCase().includes(text.toLowerCase()) && 
      item.classList.contains('completed')
    );
  }

  countCompletedProjects() {
    let count = 0;
    document.querySelectorAll('.progress-section').forEach(section => {
      const heading = section.querySelector('h3');
      if (heading && heading.textContent.includes('Projects')) {
        count += section.querySelectorAll('.checklist-item.completed').length;
      }
    });
    return count;
  }

  getOverallPercentage() {
    const totalItems = document.querySelectorAll('.checklist-item').length;
    const completedItems = document.querySelectorAll('.checklist-item.completed').length;
    return totalItems > 0 ? Math.round((completedItems / totalItems) * 100) : 0;
  }

  // Check if milestone reached and show celebration
  checkMilestones(item) {
    const section = item.closest('.progress-section');
    if (!section) return;

    const items = section.querySelectorAll('.checklist-item');
    const completed = section.querySelectorAll('.checklist-item.completed');
    
    // If just completed a full section, celebrate!
    if (items.length === completed.length && items.length > 0) {
      this.showCelebration(section.querySelector('h3')?.textContent || 'Section');
    }
  }

  // Show celebration message
  showCelebration(sectionName) {
    const message = document.createElement('div');
    message.className = 'celebration-toast';
    message.innerHTML = `
      <div style="
        position: fixed;
        top: 20px;
        right: 20px;
        background: linear-gradient(135deg, #00C853, #00a043);
        color: white;
        padding: 1rem 1.5rem;
        border-radius: 12px;
        box-shadow: 0 8px 24px rgba(0, 200, 83, 0.4);
        z-index: 9999;
        animation: slideIn 0.3s ease-out;
      ">
        <strong>🎉 Congratulations!</strong><br>
        You completed: ${sectionName}
      </div>
    `;
    
    document.body.appendChild(message);
    
    setTimeout(() => {
      message.style.animation = 'slideOut 0.3s ease-out';
      setTimeout(() => message.remove(), 300);
    }, 3000);
  }

  // Reset all progress (for testing or fresh start)
  resetProgress() {
    if (confirm('Are you sure you want to reset ALL your progress? This cannot be undone!')) {
      localStorage.removeItem(this.storageKey);
      this.progress = { skills: {}, projects: {}, tools: {} };
      document.querySelectorAll('.checklist-item.completed').forEach(item => {
        item.classList.remove('completed');
      });
      this.updateUI();
      alert('Progress reset successfully!');
    }
  }

  // Export progress data
  exportProgress() {
    const data = {
      exported: new Date().toISOString(),
      name: 'Sierra Walcott',
      academy: 'JL Solutions',
      progress: this.progress,
      stats: {
        overall: this.getOverallPercentage(),
        totalCompleted: document.querySelectorAll('.checklist-item.completed').length,
        totalItems: document.querySelectorAll('.checklist-item').length
      }
    };
    
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `sierra-progress-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }
}

// Add CSS animations
const style = document.createElement('style');
style.textContent = `
  @keyframes slideIn {
    from {
      transform: translateX(400px);
      opacity: 0;
    }
    to {
      transform: translateX(0);
      opacity: 1;
    }
  }
  
  @keyframes slideOut {
    from {
      transform: translateX(0);
      opacity: 1;
    }
    to {
      transform: translateX(400px);
      opacity: 0;
    }
  }
  
  .checklist-item {
    cursor: pointer;
    transition: all 0.2s ease;
  }
  
  .checklist-item:hover {
    background: #2a2a2a;
    transform: translateX(5px);
  }
  
  .checklist-item.completed {
    opacity: 0.7;
  }
  
  .checklist-item.completed:hover {
    opacity: 0.85;
  }
`;
document.head.appendChild(style);

// Initialize when page loads
let tracker;
document.addEventListener('DOMContentLoaded', () => {
  tracker = new ProgressTracker();
  
  // Add reset button (hidden, for debugging)
  console.log('Progress Tracker loaded! Type "tracker.resetProgress()" to reset or "tracker.exportProgress()" to export.');
});

