document.addEventListener('DOMContentLoaded', () => {
    // --- Loading Screen ---
    const loadingScreen = document.getElementById('loading-screen');
    const mainContent = document.getElementById('main-content');

    setTimeout(() => {
        loadingScreen.style.opacity = '0';
        setTimeout(() => {
            loadingScreen.style.display = 'none';
            mainContent.classList.remove('hidden');
            // Trigger animations or chart render if needed
            initFallingSigns();
            updateData();
        }, 500);
    }, 3000); // 3 seconds loading time

    // --- Custom Cursor ---
    const cursor = document.getElementById('cursor');

    document.addEventListener('mousemove', (e) => {
        cursor.style.left = e.clientX + 'px';
        cursor.style.top = e.clientY + 'px';
    });

    document.addEventListener('mousedown', () => {
        cursor.style.transform = 'translate(-50%, -50%) scale(0.8)';
    });

    document.addEventListener('mouseup', () => {
        cursor.style.transform = 'translate(-50%, -50%) scale(1)';
    });

    // Hover effects for cursor
    const interactiveElements = document.querySelectorAll('a, button, input');
    interactiveElements.forEach(el => {
        el.addEventListener('mouseenter', () => {
            cursor.style.transform = 'translate(-50%, -50%) scale(1.5)';
            cursor.style.backgroundColor = 'rgba(56, 189, 248, 0.1)';
            cursor.style.borderRadius = '50%';
        });
        el.addEventListener('mouseleave', () => {
            cursor.style.transform = 'translate(-50%, -50%) scale(1)';
            cursor.style.backgroundColor = 'transparent';
        });
    });

    // --- Falling Signs Animation ---
    function initFallingSigns() {
        const container = document.getElementById('falling-signs-container');
        const symbols = ['∑', '∫', 'π', '∞', '√', '≈', '≠', '±', '∂', 'λ', 'θ', 'Δ'];
        const symbolCount = 30;

        for (let i = 0; i < symbolCount; i++) {
            createFallingSign(container, symbols);
        }
    }

    function createFallingSign(container, symbols) {
        const sign = document.createElement('div');
        sign.classList.add('falling-sign');
        sign.textContent = symbols[Math.floor(Math.random() * symbols.length)];

        // Random properties
        const startX = Math.random() * 100; // percent
        const duration = 5 + Math.random() * 10; // seconds
        const delay = Math.random() * 5; // seconds
        const size = 1 + Math.random() * 2; // rem
        const opacity = 0.1 + Math.random() * 0.3;

        sign.style.left = `${startX}%`;
        sign.style.fontSize = `${size}rem`;
        sign.style.opacity = opacity;
        sign.style.animation = `fall ${duration}s linear ${delay}s infinite`;

        // Add keyframes dynamically if not present (or just use style)
        // Actually, let's just animate top from -10% to 110%
        // But we can't easily do infinite loop with random duration in JS without Web Animations API or CSS injection.
        // Let's inject a style tag for the keyframes if it doesn't exist, but it's easier to just use the style attribute for animation name if we defined it in CSS.
        // We didn't define 'fall' in CSS yet. Let's add it via JS.

        container.appendChild(sign);
    }

    // Add keyframes for falling
    const styleSheet = document.createElement("style");
    styleSheet.innerText = `
        @keyframes fall {
            0% { top: -10%; transform: rotate(0deg); }
            100% { top: 110%; transform: rotate(360deg); }
        }
    `;
    document.head.appendChild(styleSheet);


    // --- Interactive Visualization (Chart.js) ---
    let chart;
    const pSlider = document.getElementById('prob-p');
    const nSlider = document.getElementById('trials-n');
    const pValueDisplay = document.getElementById('p-value');
    const nValueDisplay = document.getElementById('n-value');
    const meanDisplay = document.getElementById('stat-mean');
    const varDisplay = document.getElementById('stat-var');

    function factorial(n) {
        if (n === 0 || n === 1) return 1;
        let result = 1;
        for (let i = 2; i <= n; i++) result *= i;
        return result;
    }

    function combinations(n, k) {
        return factorial(n) / (factorial(k) * factorial(n - k));
    }

    function binomialPMF(n, p, k) {
        return combinations(n, k) * Math.pow(p, k) * Math.pow(1 - p, n - k);
    }

    function updateData() {
        const n = parseInt(nSlider.value);
        const p = parseFloat(pSlider.value);

        // Update displays
        pValueDisplay.textContent = p.toFixed(2);
        nValueDisplay.textContent = n;

        // Calculate stats
        const mean = n * p;
        const variance = n * p * (1 - p);
        meanDisplay.textContent = mean.toFixed(2);
        varDisplay.textContent = variance.toFixed(2);

        // Generate data for chart
        const labels = [];
        const data = [];

        for (let k = 0; k <= n; k++) {
            labels.push(k);
            data.push(binomialPMF(n, p, k));
        }

        // Update Chart
        if (chart) {
            chart.data.labels = labels;
            chart.data.datasets[0].data = data;
            chart.update();
        } else {
            initChart(labels, data);
        }
    }

    function initChart(labels = [], data = []) {
        const ctx = document.getElementById('distributionChart').getContext('2d');

        Chart.defaults.color = '#94a3b8';
        Chart.defaults.font.family = "'Outfit', sans-serif";

        chart = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: labels,
                datasets: [{
                    label: 'Probability P(X=k)',
                    data: data,
                    backgroundColor: 'rgba(56, 189, 248, 0.6)',
                    borderColor: '#38bdf8',
                    borderWidth: 1,
                    borderRadius: 4,
                    hoverBackgroundColor: '#818cf8'
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    y: {
                        beginAtZero: true,
                        title: {
                            display: true,
                            text: 'Probability'
                        },
                        grid: {
                            color: 'rgba(255, 255, 255, 0.05)'
                        }
                    },
                    x: {
                        title: {
                            display: true,
                            text: 'Number of Successes (k)'
                        },
                        grid: {
                            display: false
                        }
                    }
                },
                plugins: {
                    legend: {
                        display: false
                    },
                    tooltip: {
                        backgroundColor: 'rgba(15, 23, 42, 0.9)',
                        titleColor: '#38bdf8',
                        bodyColor: '#f8fafc',
                        borderColor: 'rgba(255, 255, 255, 0.1)',
                        borderWidth: 1,
                        padding: 10,
                        callbacks: {
                            label: function (context) {
                                return `Probability: ${(context.raw * 100).toFixed(2)}%`;
                            }
                        }
                    }
                },
                animation: {
                    duration: 500
                }
            }
        });
    }

    // Event Listeners
    pSlider.addEventListener('input', updateData);
    nSlider.addEventListener('input', updateData);

    // Initial call
    // Note: initChart is called in the loading timeout, but we need data first.
    // Let's modify the init flow.
    // We'll call updateData() which calls initChart() if it doesn't exist.
    // But updateData needs the DOM elements.
    // We can just call updateData() inside the timeout or right here if we want it ready before show.
    // Let's just override the initChart call in the timeout to updateData.
});

// Smooth Scroll
document.getElementById('explore-btn').addEventListener('click', () => {
    document.getElementById('biography').scrollIntoView({ behavior: 'smooth' });
});
