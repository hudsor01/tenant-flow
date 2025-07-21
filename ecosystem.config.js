module.exports = {
    apps: [{
        name: 'tenantflow-backend',
        script: 'npm',
        args: 'run dev',
        cwd: './apps/backend',
        instances: 1,
        autorestart: true,
        watch: false,
        max_memory_restart: '1G',
        env: {
            NODE_ENV: 'development',
            PORT: 3002
        },
        env_production: {
            NODE_ENV: 'production',
            PORT: 3002
        },
        error_file: './logs/err.log',
        out_file: './logs/out.log',
        log_file: './logs/combined.log',
        time: true,
        log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
        merge_logs: true,
        kill_timeout: 5000,
        wait_ready: true,
        listen_timeout: 10000,
        restart_delay: 4000
    }]
}