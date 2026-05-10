$(document).ready(function() {
    console.log("jQuery initialized and main.js loaded");

    // 1. Auto-hide alerts after 5 seconds with slideUp animation
    setTimeout(function() {
        $('.alert-custom').slideUp(300, function() {
            $(this).remove();
        });
    }, 5000);

    // 2. Dynamic file input labels
    $('input[type="file"]').on('change', function(e) {
        const fileNames = Array.from(e.target.files)
            .map(file => file.name)
            .join(', ');
        const $label = $(this).next('.form-text');
        if ($label.length) {
            $label.text(fileNames || 'Выберите файл(ы)');
        }
    });

    // 3. Date input validation: deadline cannot be before today
    $('input[type="date"][name="deadline"]').on('change', function() {
        const selectedDate = new Date($(this).val());
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        if (selectedDate < today) {
            alert('Срок исполнения не может быть раньше текущей даты!');
            $(this).val('');
        }
    });

    // 4. Date input validation: letter_date cannot be after received_date
    $('input[type="date"][name="letter_date"]').on('change', function() {
        const letterDateVal = $(this).val();
        const receivedDateVal = $('input[name="received_date"]').val();
        
        if (letterDateVal && receivedDateVal) {
            const letterDate = new Date(letterDateVal);
            const receivedDate = new Date(receivedDateVal);
            if (letterDate > receivedDate) {
                alert('Дата письма не может быть позже даты получения!');
                $(this).val('');
            }
        }
    });

    $('input[type="date"][name="received_date"]').on('change', function() {
        const receivedDateVal = $(this).val();
        const letterDateVal = $('input[name="letter_date"]').val();
        
        if (receivedDateVal && letterDateVal) {
            const receivedDate = new Date(receivedDateVal);
            const letterDate = new Date(letterDateVal);
            if (receivedDate < letterDate) {
                alert('Дата получения не может быть раньше даты письма!');
                $(this).val('');
            }
        }
    });

    // 5. User Creation & Edition Validation
    $('.form-user-validation').on('submit', function(e) {
        const $password = $('#password');
        const $confirmPassword = $('#confirm_password');
        
        if ($password.length && $password.val().length > 0 && $password.val().length < 6) {
            e.preventDefault();
            alert('Пароль должен содержать не менее 6 символов!');
            return false;
        }

        if ($password.length && $confirmPassword.length && $password.val() !== $confirmPassword.val()) {
            e.preventDefault();
            alert('Пароли не совпадают!');
            return false;
        }
    });

    // 6. Letter AJAX deletion (admin only)
    $(document).on('click', '.btn-delete-letter', function(e) {
        e.preventDefault();
        const letterId = $(this).data('id');
        const letterNum = $(this).data('number');
        const $row = $(this).closest('tr');

        if (confirm(`Вы уверены, что хотите удалить письмо №${letterNum}?`)) {
            $.ajax({
                url: `/api/letters/${letterId}`,
                type: 'DELETE',
                dataType: 'json',
                success: function(response) {
                    if (response.success) {
                        $row.fadeOut(300, function() {
                            $(this).remove();
                        });
                        showFloatingAlert('success', response.message || 'Письмо успешно удалено');
                    } else {
                        showFloatingAlert('danger', response.message || 'Не удалось удалить письмо');
                    }
                },
                error: function(xhr) {
                    const errMsg = xhr.responseJSON ? xhr.responseJSON.message : 'Ошибка сервера при удалении письма';
                    showFloatingAlert('danger', errMsg);
                }
            });
        }
    });

    // 7. User AJAX Deletion
    $(document).on('click', '.btn-delete-user', function(e) {
        e.preventDefault();
        const userId = $(this).data('id');
        const username = $(this).data('username');
        const $row = $(this).closest('tr');

        if (confirm(`Вы уверены, что хотите удалить пользователя "${username}"?`)) {
            $.ajax({
                url: `/api/users/${userId}`,
                type: 'DELETE',
                dataType: 'json',
                success: function(response) {
                    if (response.success) {
                        $row.fadeOut(300, function() {
                            $(this).remove();
                        });
                        showFloatingAlert('success', response.message || 'Пользователь удален');
                    } else {
                        showFloatingAlert('danger', response.message || 'Не удалось удалить пользователя');
                    }
                },
                error: function(xhr) {
                    const errMsg = xhr.responseJSON ? xhr.responseJSON.message : 'Ошибка при удалении';
                    showFloatingAlert('danger', errMsg);
                }
            });
        }
    });

    // 8. User Toggle Active Status AJAX
    $(document).on('click', '.btn-toggle-status', function(e) {
        e.preventDefault();
        const userId = $(this).data('id');
        const $btn = $(this);
        const $badge = $btn.closest('tr').find('.status-active-badge');

        $.ajax({
            url: `/api/users/${userId}/toggle`,
            type: 'PATCH',
            dataType: 'json',
            success: function(response) {
                if (response.success) {
                    if (response.is_active) {
                        $badge.removeClass('bg-danger').addClass('bg-success').text('Активен');
                        $btn.removeClass('btn-outline-success').addClass('btn-outline-warning')
                            .html('<i class="bi bi-person-x"></i> Заблокировать');
                        showFloatingAlert('success', 'Пользователь активирован');
                    } else {
                        $badge.removeClass('bg-success').addClass('bg-danger').text('Заблокирован');
                        $btn.removeClass('btn-outline-warning').addClass('btn-outline-success')
                            .html('<i class="bi bi-person-check"></i> Активировать');
                        showFloatingAlert('warning', 'Пользователь заблокирован');
                    }
                }
            },
            error: function(xhr) {
                showFloatingAlert('danger', 'Не удалось изменить статус пользователя');
            }
        });
    });

    // 9. AJAX Attachment deletion
    $(document).on('click', '.attachment-delete-btn', function(e) {
        e.preventDefault();
        const attachmentId = $(this).data('id');
        const fileName = $(this).data('name');
        const $chip = $(this).closest('.attachment-chip');

        if (confirm(`Удалить вложение "${fileName}"?`)) {
            $.ajax({
                url: `/api/attachments/${attachmentId}`,
                type: 'DELETE',
                dataType: 'json',
                success: function(response) {
                    if (response.success) {
                        $chip.fadeOut(300, function() {
                            $(this).remove();
                        });
                        showFloatingAlert('success', response.message || 'Вложение удалено');
                    } else {
                        showFloatingAlert('danger', response.message || 'Не удалось удалить вложение');
                    }
                },
                error: function(xhr) {
                    showFloatingAlert('danger', 'Ошибка при удалении вложения');
                }
            });
        }
    });

    // 10. AJAX letter searching and filtering
    $('#letter-search-form').on('submit', function(e) {
        e.preventDefault();
        performLetterSearch();
    });

    // Trigger search on input typing or dropdown selection for real-time interaction
    $('#search-input, #status-filter, #date-from, #date-to').on('change input', function() {
        // Debounce text search input
        clearTimeout(window.searchTimeout);
        window.searchTimeout = setTimeout(performLetterSearch, 300);
    });

    function performLetterSearch() {
        const formData = {
            search: $('#search-input').val(),
            status: $('#status-filter').val(),
            date_from: $('#date-from').val(),
            date_to: $('#date-to').val()
        };

        $.ajax({
            url: '/api/letters',
            type: 'GET',
            data: formData,
            dataType: 'json',
            success: function(response) {
                if (response.success) {
                    updateLettersTable(response.letters);
                }
            },
            error: function() {
                console.error('Ошибка при поиске писем');
            }
        });
    }

    function updateLettersTable(letters) {
        const $tbody = $('#letters-table-body');
        $tbody.empty();

        if (letters.length === 0) {
            $tbody.append(`
                <tr>
                    <td colspan="7" class="text-center py-4 text-muted">
                        <i class="bi bi-inbox fs-2 d-block mb-2"></i>
                        Письма не найдены
                    </td>
                </tr>
            `);
            return;
        }

        letters.forEach(function(letter) {
            let statusBadge = '';
            switch (letter.status) {
                case 'Зарегистрировано':
                    statusBadge = '<span class="badge badge-status badge-registered"><i class="bi bi-bookmark-plus"></i> Зарегистрировано</span>';
                    break;
                case 'В работе':
                    statusBadge = '<span class="badge badge-status badge-in-progress"><i class="bi bi-clock"></i> В работе</span>';
                    break;
                case 'На контроле':
                    statusBadge = '<span class="badge badge-status badge-on-control"><i class="bi bi-exclamation-circle"></i> На контроле</span>';
                    break;
                case 'Исполнено':
                    statusBadge = '<span class="badge badge-status badge-executed"><i class="bi bi-check-lg"></i> Исполнено</span>';
                    break;
                case 'Архивировано':
                    statusBadge = '<span class="badge badge-status badge-archived"><i class="bi bi-archive"></i> Архивировано</span>';
                    break;
            }

            const regDate = formatDate(letter.registration_date);
            const letterDate = formatDate(letter.letter_date);
            const executorName = letter.executor_name || '<span class="text-muted small">Не назначен</span>';
            
            // Check roles using attributes from container if available
            const userRoleId = parseInt($('#letters-container').data('role-id'));
            const currentUserId = parseInt($('#letters-container').data('user-id'));

            let actionsHtml = `<a href="/letters/${letter.id}" class="btn btn-sm btn-info text-white me-1">Открыть</a>`;
            
            // Registrar who created it or Admin can edit
            if (userRoleId === 1 || (userRoleId === 2 && letter.registrar_id === currentUserId)) {
                actionsHtml += `<a href="/letters/${letter.id}/edit" class="btn btn-sm btn-primary me-1">Редактировать</a>`;
            }

            // Admin can delete
            if (userRoleId === 1) {
                actionsHtml += `<button class="btn btn-sm btn-danger btn-delete-letter me-1" data-id="${letter.id}" data-number="${letter.incoming_number}">Удалить</button>`;
            }

            // Executor can update status of assigned active letters
            if (userRoleId === 3 && letter.executor_id === currentUserId && (letter.status === 'В работе' || letter.status === 'На контроле')) {
                actionsHtml += `<button class="btn btn-sm btn-success btn-update-status-modal me-1" data-id="${letter.id}" data-number="${letter.incoming_number}" data-status="${letter.status}" data-result="${letter.result || ''}">Отчитаться</button>`;
            }

            $tbody.append(`
                <tr class="animate-fade-in">
                    <td class="fw-bold text-primary">${letter.incoming_number}</td>
                    <td>${regDate}</td>
                    <td>
                        <div class="fw-bold">${letter.sender_name}</div>
                        <div class="text-muted small">${letter.subject}</div>
                    </td>
                    <td>${letterDate}</td>
                    <td>${executorName}</td>
                    <td>${statusBadge}</td>
                    <td>
                        <div class="d-flex">
                            ${actionsHtml}
                        </div>
                    </td>
                </tr>
            `);
        });
    }

    // Helper: format ISO date to DD.MM.YYYY
    function formatDate(dateStr) {
        if (!dateStr) return '';
        const d = new Date(dateStr);
        if (isNaN(d.getTime())) return dateStr;
        const day = String(d.getDate()).padStart(2, '0');
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const year = d.getFullYear();
        return `${day}.${month}.${year}`;
    }

    // 11. AJAX update status modal for executor
    $(document).on('click', '.btn-update-status-modal', function() {
        const id = $(this).data('id');
        const number = $(this).data('number');
        const status = $(this).data('status');
        const result = $(this).data('result');

        $('#modal-letter-id').val(id);
        $('#modal-letter-number').text(number);
        $('#modal-status').val(status);
        $('#modal-result').val(result);

        // Show/hide result field based on status selection
        toggleResultField(status);

        // Open Bootstrap modal
        const myModal = new bootstrap.Modal(document.getElementById('statusUpdateModal'));
        myModal.show();
    });

    $('#modal-status').on('change', function() {
        toggleResultField($(this).val());
    });

    function toggleResultField(status) {
        if (status === 'Исполнено') {
            $('#result-field-group').slideDown(200);
            $('#modal-result').attr('required', true);
        } else {
            $('#result-field-group').slideUp(200);
            $('#modal-result').removeAttr('required');
        }
    }

    // Status change submission via AJAX
    $('#status-update-form').on('submit', function(e) {
        e.preventDefault();
        const id = $('#modal-letter-id').val();
        const status = $('#modal-status').val();
        const result = $('#modal-result').val();

        $.ajax({
            url: `/api/letters/${id}/status`,
            type: 'PATCH',
            dataType: 'json',
            contentType: 'application/json',
            data: JSON.stringify({ status, result }),
            success: function(response) {
                if (response.success) {
                    // Hide modal
                    bootstrap.Modal.getInstance(document.getElementById('statusUpdateModal')).hide();
                    
                    // Show message and reload table
                    showFloatingAlert('success', response.message || 'Статус успешно обновлен');
                    
                    if ($('#letters-table-body').length) {
                        performLetterSearch();
                    } else {
                        // If not on letters index, reload
                        location.reload();
                    }
                }
            },
            error: function(xhr) {
                const errMsg = xhr.responseJSON ? xhr.responseJSON.message : 'Ошибка при обновлении статуса';
                showFloatingAlert('danger', errMsg);
            }
        });
    });

    // 12. Floating notification alerts helper
    function showFloatingAlert(type, message) {
        const icon = type === 'success' ? 'bi-check-circle-fill' : (type === 'warning' ? 'bi-exclamation-triangle-fill' : 'bi-exclamation-octagon-fill');
        const alertHtml = `
            <div class="alert alert-custom alert-${type} alert-dismissible fade show shadow-sm animate-fade-in" role="alert">
                <div class="d-flex align-items-center">
                    <i class="bi ${icon} me-2 fs-5"></i>
                    <div>${message}</div>
                </div>
                <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
            </div>
        `;
        $('.alert-container').prepend(alertHtml);
        
        // Auto-remove after 5s
        setTimeout(function() {
            $('.alert-container .alert-custom').first().slideUp(300, function() {
                $(this).remove();
            });
        }, 5000);
    }
});