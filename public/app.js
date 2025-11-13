// Pagination state
let currentPage = 0;
const pageSize = 20;

// Fetch and display usage statistics
async function fetchUsageStats() {
	try {
		const response = await fetch("/api/usage");
		const data = await response.json();

		// Update date
		document.getElementById("current-date").textContent =
			`Updated: ${new Date().toLocaleString()} (${data.date})`;

		// Update premium tier
		updateTierDisplay("premium", data.premium);

		// Update mini tier
		updateTierDisplay("mini", data.mini);
	} catch (error) {
		console.error("Error fetching usage stats:", error);
	}
}

// Update a tier's display
function updateTierDisplay(tier, data) {
	const percentage = data.percentage;

	// Update numbers
	document.getElementById(`${tier}-used`).textContent =
		data.used.toLocaleString();
	document.getElementById(`${tier}-limit`).textContent =
		data.limit.toLocaleString();
	document.getElementById(`${tier}-percentage`).textContent =
		`${percentage.toFixed(1)}%`;

	// Update progress bar
	const progressBar = document.getElementById(`${tier}-progress`);
	progressBar.style.width = `${Math.min(percentage, 100)}%`;

	// Update colors based on usage
	const percentageEl = document.getElementById(`${tier}-percentage`);
	percentageEl.classList.remove("warning", "danger");
	progressBar.classList.remove("warning", "danger");

	if (percentage >= 90) {
		percentageEl.classList.add("danger");
		progressBar.classList.add("danger");
	} else if (percentage >= 75) {
		percentageEl.classList.add("warning");
		progressBar.classList.add("warning");
	}
}

// Fetch and display request history
async function fetchRequestHistory(offset = 0) {
	try {
		const response = await fetch(
			`/api/history?limit=${pageSize}&offset=${offset}`,
		);
		const data = await response.json();

		const tbody = document.getElementById("history-tbody");

		if (data.data.length === 0) {
			tbody.innerHTML =
				'<tr><td colspan="7" class="loading">No requests yet</td></tr>';
			return;
		}

		tbody.innerHTML = data.data
			.map(
				(entry) => `
      <tr>
        <td>${formatTimestamp(entry.timestamp)}</td>
        <td><code>${entry.model}</code></td>
        <td><span class="tier-badge tier-${entry.tier}">${entry.tier}</span></td>
        <td>${entry.prompt_tokens.toLocaleString()}</td>
        <td>${entry.completion_tokens.toLocaleString()}</td>
        <td><strong>${entry.total_tokens.toLocaleString()}</strong></td>
        <td>${formatStatus(entry.status)}</td>
      </tr>
    `,
			)
			.join("");

		// Update pagination
		updatePagination(data.pagination);
	} catch (error) {
		console.error("Error fetching request history:", error);
		document.getElementById("history-tbody").innerHTML =
			'<tr><td colspan="7" class="loading">Error loading history</td></tr>';
	}
}

// Format timestamp to readable format
function formatTimestamp(timestamp) {
	const date = new Date(timestamp);
	return date.toLocaleString("en-US", {
		month: "short",
		day: "numeric",
		hour: "2-digit",
		minute: "2-digit",
		second: "2-digit",
	});
}

// Format status code with badge
function formatStatus(status) {
	const statusClass = status >= 200 && status < 300 ? "success" : "error";
	return `<span class="status-badge status-${statusClass}">${status}</span>`;
}

// Update pagination controls
function updatePagination(pagination) {
	const pageInfo = document.getElementById("page-info");
	const prevBtn = document.getElementById("prev-btn");
	const nextBtn = document.getElementById("next-btn");

	const currentPageNum = Math.floor(pagination.offset / pageSize) + 1;
	const totalPages = Math.ceil(pagination.total / pageSize);

	pageInfo.textContent = `Page ${currentPageNum} of ${totalPages}`;

	prevBtn.disabled = pagination.offset === 0;
	nextBtn.disabled = !pagination.hasMore;

	currentPage = currentPageNum - 1;
}

// Navigate to previous page
function _prevPage() {
	if (currentPage > 0) {
		const newOffset = (currentPage - 1) * pageSize;
		fetchRequestHistory(newOffset);
	}
}

// Navigate to next page
function _nextPage() {
	const newOffset = (currentPage + 1) * pageSize;
	fetchRequestHistory(newOffset);
}

// Reconcile usage with OpenAI
async function _reconcileUsage() {
	const btn = document.getElementById("reconcile-btn");
	const status = document.getElementById("reconcile-status");

	// Disable button and show loading
	btn.disabled = true;
	status.className = "reconcile-status visible loading";
	status.innerHTML = "Reconciling with OpenAI...";

	try {
		const response = await fetch("/api/reconcile", {
			method: "POST",
		});

		const data = await response.json();

		if (!response.ok || !data.success) {
			throw new Error(data.error || "Reconciliation failed");
		}

		// Show success message with details
		const premiumAdded = data.premium.added;
		const miniAdded = data.mini.added;
		const totalAdded = premiumAdded + miniAdded;

		let message = `✓ Reconciliation complete for ${data.date}`;

		if (totalAdded > 0) {
			message += `<div class="reconcile-details">`;
			message += `<strong>Updated:</strong> `;
			const parts = [];
			if (premiumAdded > 0) {
				parts.push(`Premium +${premiumAdded.toLocaleString()} tokens`);
			}
			if (miniAdded > 0) {
				parts.push(`Mini +${miniAdded.toLocaleString()} tokens`);
			}
			message += parts.join(", ");
			message += `</div>`;
		} else {
			message += `<div class="reconcile-details">No discrepancies found - usage already accurate!</div>`;
		}

		status.className = "reconcile-status visible success";
		status.innerHTML = message;

		// Refresh usage stats to show updated values
		fetchUsageStats();

		// Hide success message after 5 seconds
		setTimeout(() => {
			status.classList.remove("visible");
		}, 5000);
	} catch (error) {
		console.error("Reconciliation error:", error);

		status.className = "reconcile-status visible error";
		status.innerHTML = `✗ Reconciliation failed: ${error.message}`;

		// Hide error message after 10 seconds
		setTimeout(() => {
			status.classList.remove("visible");
		}, 10000);
	} finally {
		// Re-enable button
		btn.disabled = false;
	}
}

// Refresh all data
function _refreshData() {
	fetchUsageStats();
	fetchRequestHistory(currentPage * pageSize);
}

// Initialize dashboard
function init() {
	fetchUsageStats();
	fetchRequestHistory(0);

	// Auto-refresh every 10 seconds
	setInterval(() => {
		fetchUsageStats();
	}, 10000);
}

// Start the app when DOM is loaded
if (document.readyState === "loading") {
	document.addEventListener("DOMContentLoaded", init);
} else {
	init();
}
