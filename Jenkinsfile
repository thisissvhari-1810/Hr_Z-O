pipeline {
    agent any

    environment {
        REPO_URL        = 'https://github.com/YOUR_USERNAME/PeopleFlow.git'
        GIT_CREDENTIALS = 'git-hub-token'
        BRANCH          = 'main'

        VM_HOST         = '140.245.254.149'

        FRONTEND_PORT   = '4000'
        BACKEND_PORT    = '5000'

        COMPOSE_PROJECT_NAME = 'peopleflow'

        NODE_ENV = 'production'
        PORT     = '5000'

        DB_HOST     = 'postgres'
        DB_PORT     = '5432'
        DB_NAME     = 'peopleflow'
        DB_USER     = 'postgres'
        DB_PASSWORD = 'postgres'
    }

    stages {

        stage('Clean Workspace') {
            steps {
                cleanWs()
            }
        }

        stage('Checkout Source') {
            steps {
                git branch: "${BRANCH}",
                    credentialsId: "${GIT_CREDENTIALS}",
                    url: "${REPO_URL}"
            }
        }

        stage('Verify Docker') {
            steps {
                sh '''
                set -e

                docker --version

                if ! docker compose version >/dev/null 2>&1; then
                    echo "Installing Docker Compose plugin..."

                    ARCH=$(uname -m)

                    mkdir -p $HOME/.docker/cli-plugins

                    curl -fsSL \
                    https://github.com/docker/compose/releases/download/v2.29.7/docker-compose-linux-${ARCH} \
                    -o $HOME/.docker/cli-plugins/docker-compose

                    chmod +x $HOME/.docker/cli-plugins/docker-compose
                fi

                docker compose version
                '''
            }
        }

        stage('Generate .env') {
            steps {
                sh '''
                cat > .env <<EOF
NODE_ENV=${NODE_ENV}
PORT=${PORT}

DB_HOST=${DB_HOST}
DB_PORT=${DB_PORT}
DB_NAME=${DB_NAME}
DB_USER=${DB_USER}
DB_PASSWORD=${DB_PASSWORD}
EOF

                echo ".env created"

                sed 's/=.*/=***/' .env
                '''
            }
        }

        stage('Build & Deploy') {
            steps {
                sh '''
                set -e

                docker compose down --remove-orphans || true

                docker compose build --no-cache

                docker compose up -d

                docker image prune -f
                '''
            }
        }

        stage('Wait for Backend') {
            steps {
                sh '''
                echo "Waiting for backend..."

                for i in $(seq 1 60); do

                    STATUS=$(docker inspect -f '{{.State.Health.Status}}' peopleflow-backend 2>/dev/null || echo "starting")

                    if [ "$STATUS" = "healthy" ]; then
                        echo "Backend is healthy."
                        exit 0
                    fi

                    if [ "$STATUS" = "unhealthy" ]; then
                        docker compose logs backend
                        exit 1
                    fi

                    sleep 5

                done

                echo "Backend failed to become healthy."

                docker compose logs

                exit 1
                '''
            }
        }

        stage('Verify Containers') {
            steps {
                sh '''
                docker compose ps
                '''
            }
        }

    }

    post {

        success {
            echo "Deployment Successful"

            echo "Frontend : http://${VM_HOST}:${FRONTEND_PORT}"
            echo "Backend  : http://${VM_HOST}:${BACKEND_PORT}/api/health"
        }

        failure {
            echo "Deployment Failed"

            sh '''
            docker compose logs --tail=200 || true

            docker compose ps -a || true
            '''
        }

        always {
            sh 'docker ps -a'
        }
    }
}