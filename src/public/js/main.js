// Enable Bootstrap tooltips
document.addEventListener('DOMContentLoaded', function() {
    var tooltipTriggerList = [].slice.call(document.querySelectorAll('[data-bs-toggle="tooltip"]'));
    var tooltipList = tooltipTriggerList.map(function(tooltipTriggerEl) {
        return new bootstrap.Tooltip(tooltipTriggerEl);
    });
});

// Auto-hide alerts after 5 seconds
document.addEventListener('DOMContentLoaded', function() {
    setTimeout(function() {
        var alerts = document.querySelectorAll('.alert:not(.alert-permanent)');
        alerts.forEach(function(alert) {
            var bsAlert = new bootstrap.Alert(alert);
            bsAlert.close();
        });
    }, 5000);
});

// Confirm dangerous actions
document.addEventListener('DOMContentLoaded', function() {
    var dangerousForms = document.querySelectorAll('form[data-confirm]');
    dangerousForms.forEach(function(form) {
        form.addEventListener('submit', function(e) {
            if (!confirm(this.dataset.confirm)) {
                e.preventDefault();
            }
        });
    });
});

// File input customization
document.addEventListener('DOMContentLoaded', function() {
    var fileInputs = document.querySelectorAll('input[type="file"]');
    fileInputs.forEach(function(input) {
        input.addEventListener('change', function() {
            var fileName = '';
            if (this.files && this.files.length > 1) {
                fileName = this.files.length + ' файлов выбрано';
            } else {
                fileName = this.files[0].name;
            }
            var label = this.nextElementSibling;
            if (label) {
                label.innerHTML = fileName;
            }
        });
    });
});

// Table sorting
document.addEventListener('DOMContentLoaded', function() {
    var tables = document.querySelectorAll('table.sortable');
    tables.forEach(function(table) {
        var headers = table.querySelectorAll('th[data-sort]');
        headers.forEach(function(header) {
            header.addEventListener('click', function() {
                var column = this.dataset.sort;
                var tbody = table.querySelector('tbody');
                var rows = Array.from(tbody.querySelectorAll('tr'));
                var isAsc = this.classList.contains('asc');

                rows.sort(function(a, b) {
                    var aValue = a.querySelector(`td[data-${column}]`).dataset[column];
                    var bValue = b.querySelector(`td[data-${column}]`).dataset[column];

                    if (isNaN(aValue)) {
                        return isAsc ? 
                            bValue.localeCompare(aValue) : 
                            aValue.localeCompare(bValue);
                    } else {
                        return isAsc ? 
                            bValue - aValue : 
                            aValue - bValue;
                    }
                });

                headers.forEach(h => h.classList.remove('asc', 'desc'));
                this.classList.toggle('asc', !isAsc);
                this.classList.toggle('desc', isAsc);

                tbody.innerHTML = '';
                rows.forEach(row => tbody.appendChild(row));
            });
        });
    });
});

// Form validation
document.addEventListener('DOMContentLoaded', function() {
    var forms = document.querySelectorAll('form.needs-validation');
    forms.forEach(function(form) {
        form.addEventListener('submit', function(e) {
            if (!form.checkValidity()) {
                e.preventDefault();
                e.stopPropagation();
            }
            form.classList.add('was-validated');
        });
    });
}); 