const API_BASE = '/api';

export async function fetchHealth() {
  const res = await fetch(`${API_BASE}/health`);
  return res.json();
}

export async function fetchStats() {
  const res = await fetch(`${API_BASE}/stats`);
  return res.json();
}

export async function fetchVendors() {
  const res = await fetch(`${API_BASE}/vendors`);
  return res.json();
}

export async function fetchVendorDetails(vendorId) {
  const res = await fetch(`${API_BASE}/vendors/${vendorId}`);
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: 'Failed to fetch vendor' }));
    throw new Error(err.detail || 'Vendor not found');
  }
  return res.json();
}

export async function loadDemoScenario(scenario) {
  const res = await fetch(`${API_BASE}/intake/demo-load`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ scenario }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: 'Failed to load demo scenario' }));
    throw new Error(err.detail || 'Demo load failed');
  }
  return res.json();
}

export async function submitVendorIntake(formData) {
  const res = await fetch(`${API_BASE}/intake`, {
    method: 'POST',
    body: formData,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: 'Intake submission failed' }));
    throw new Error(err.detail || 'Intake failed');
  }
  return res.json();
}

export async function reVerifyVendor(vendorId) {
  const res = await fetch(`${API_BASE}/vendors/${vendorId}/re-verify`, {
    method: 'POST',
  });
  return res.json();
}

export async function generateFollowupDraft(vendorId) {
  const res = await fetch(`${API_BASE}/vendors/${vendorId}/discrepancies/generate-followup`, {
    method: 'POST',
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: 'Failed to generate draft' }));
    throw new Error(err.detail || 'Draft generation failed');
  }
  return res.json();
}

export async function updateFollowupDraft(followupId, { subject, email_content, recipient_email }) {
  const res = await fetch(`${API_BASE}/followups/${followupId}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ subject, email_content, recipient_email }),
  });
  return res.json();
}

export async function sendFollowupEmail(followupId, reviewerName = 'Procurement Officer') {
  const res = await fetch(`${API_BASE}/followups/${followupId}/send?reviewer_name=${encodeURIComponent(reviewerName)}`, {
    method: 'POST',
  });
  return res.json();
}

export async function resolveDiscrepancy(vendorId, payload) {
  const isFormData = typeof FormData !== 'undefined' && payload instanceof FormData;
  const res = await fetch(`${API_BASE}/vendors/${vendorId}/resolve-discrepancy`, {
    method: 'POST',
    headers: isFormData ? {} : { 'Content-Type': 'application/json' },
    body: isFormData ? payload : JSON.stringify(payload),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: 'Failed to resolve discrepancy' }));
    throw new Error(err.detail || 'Resolution failed');
  }
  return res.json();
}

export async function overrideDecision(vendorId, { decision, reviewer_name, reviewer_comments }) {
  const res = await fetch(`${API_BASE}/vendors/${vendorId}/decision`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ decision, reviewer_name, reviewer_comments }),
  });
  return res.json();
}

export async function deleteVendor(vendorId) {
  const res = await fetch(`${API_BASE}/vendors/${vendorId}`, {
    method: 'DELETE',
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: 'Failed to delete vendor' }));
    throw new Error(err.detail || 'Delete failed');
  }
  return res.json();
}

