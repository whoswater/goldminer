// Confirm before delete
document.addEventListener('click', function(e) {
    if (e.target.closest('.btn-delete')) {
        if (!confirm('确定要删除这条记录吗？')) {
            e.preventDefault();
        }
    }
});

// Auto-dismiss alerts after 3 seconds
document.addEventListener('DOMContentLoaded', function() {
    document.querySelectorAll('.alert-dismissible').forEach(function(alert) {
        setTimeout(function() {
            var bsAlert = bootstrap.Alert.getOrCreateInstance(alert);
            bsAlert.close();
        }, 3000);
    });
});
