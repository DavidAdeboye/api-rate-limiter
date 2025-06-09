const axios = require('axios');

async function clearRateLimit() {
    try {
        await axios.delete('http://localhost:3000/reset-limit');
        console.log('Rate limit cleared');
    } catch (error) {
        console.log('Failed to clear rate limit');
    }
}

async function spamRequests() {
    // Clear rate limit before testing
    await clearRateLimit();
    
    console.log('Sending 15 concurrent requests...');
    
    // Create all requests at once for maximum concurrency
    const requests = Array(15).fill().map((_, i) => 
        axios.get('http://localhost:3000/').then(
            response => ({ 
                index: i,
                status: 'fulfilled',
                value: response 
            }),
            error => ({
                index: i,
                status: 'rejected',
                reason: error
            })
        )
    );
    
    // Wait for all requests and sort by index
    const results = await Promise.all(requests);
    results.sort((a, b) => a.index - b.index);
    
    // Display results
    results.forEach(result => {
        console.log(`Request ${result.index + 1}:`);
        if (result.status === 'fulfilled') {
            const response = result.value;
            console.log(`Status: ${response.status}`);
            console.log('Rate Limit Headers:');
            console.log(`Remaining: ${response.headers['x-ratelimit-remaining']}`);
            console.log(`Reset: ${response.headers['x-ratelimit-reset']}s`);
        } else {
            const error = result.reason;
            if (error.response) {
                console.log(`Status: ${error.response.status}`);
                console.log('Rate Limit Headers:');
                console.log(`Remaining: ${error.response.headers['x-ratelimit-remaining']}`);
                console.log(`Reset: ${error.response.headers['x-ratelimit-reset']}s`);
                console.log(`Error: ${error.response.data.error}`);
            } else {
                console.log('Request failed:', error.message);
            }
        }
        console.log('-------------------');
    });
}

// Run the test
spamRequests();
