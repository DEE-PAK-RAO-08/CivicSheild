export const fetchApi = async (endpoint, options = {}) => {
  try {
    const response = await fetch(`/api${endpoint}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
    });
    
    const data = await response.json().catch(() => null);
    
    if (!response.ok) {
      throw { status: response.status, data };
    }
    
    return data;
  } catch (error) {
    throw error;
  }
};

export const maskHash = (hash) => {
  if (!hash || hash.length < 16) return hash;
  return `${hash.substring(0, 8)}...${hash.substring(hash.length - 4)}`;
};

export const formatCurrency = (amount) => {
  return typeof amount === 'number' 
    ? `₹${amount.toLocaleString('en-IN')}` 
    : amount;
};

export const formatDate = (isoString) => {
  if (!isoString) return 'N/A';
  const date = new Date(isoString);
  return date.toLocaleString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  });
};
