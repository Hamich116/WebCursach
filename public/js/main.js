// Auto-hide alerts after 5 seconds
document.addEventListener('DOMContentLoaded', function() {
    // Handle alerts
    const alerts = document.querySelectorAll('.alert');
    alerts.forEach(function(alert) {
        setTimeout(function() {
            alert.classList.add('fade');
            setTimeout(function() {
                alert.remove();
            }, 150);
        }, 5000);
    });

    // Handle file inputs
    const fileInputs = document.querySelectorAll('input[type="file"]');
    fileInputs.forEach(function(input) {
        input.addEventListener('change', function(e) {
            const fileName = Array.from(e.target.files)
                .map(file => file.name)
                .join(', ');
            const label = input.nextElementSibling;
            if (label && label.classList.contains('form-text')) {
                label.textContent = fileName || 'Выберите файл(ы)';
            }
        });
    });

    // Handle date inputs
    const deadlineInputs = document.querySelectorAll('input[type="date"][name="deadline"]');
    deadlineInputs.forEach(function(input) {
        input.addEventListener('change', function() {
            const selectedDate = new Date(this.value);
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            
            if (selectedDate < today) {
                alert('Срок исполнения не может быть раньше текущей даты');
                this.value = '';
            }
        });
    });

    // Handle letter date inputs
    const letterDateInputs = document.querySelectorAll('input[type="date"][name="letter_date"]');
    letterDateInputs.forEach(function(input) {
        input.addEventListener('change', function() {
            const letterDate = new Date(this.value);
            const receivedDate = document.querySelector('input[name="received_date"]');
            
            if (receivedDate && letterDate > new Date(receivedDate.value)) {
                alert('Дата письма не может быть позже даты получения');
                this.value = '';
            }
        });
    });

    // Handle received date inputs
    const receivedDateInputs = document.querySelectorAll('input[type="date"][name="received_date"]');
    receivedDateInputs.forEach(function(input) {
        input.addEventListener('change', function() {
            const receivedDate = new Date(this.value);
            const letterDate = document.querySelector('input[name="letter_date"]');
            
            if (letterDate && receivedDate < new Date(letterDate.value)) {
                alert('Дата получения не может быть раньше даты письма');
                this.value = '';
            }
        });
    });
}); 