// ----------------------------------------------------------------------
// PeopleFlow — CI/CD pipeline
//
// This is a Multibranch Pipeline. Jenkins's "Declarative: Checkout SCM"
// stage (added automatically by Jenkins) already clones the repo for us.
// Do NOT add a manual `cleanWs()` + `git ...` checkout — that would wipe
// the workspace and then try to clone from a different URL.
// ----------------------------------------------------------------------
pipeline {
    agent any

    environment {
        // The deploy target. Update VM_HOST if you move hosts.
        VM_HOST       = '140.245.254.149'

        // ---- Host port mappings (interpolated by docker-compose.yaml) ----
        // FRONTEND_HOST_PORT is what users hit in the browser.
        // BACKEND_HOST_PORT  is the backend exposed for debugging / direct API access.
        // Pick ports that are free on the deploy VM. NOTE: port 4000 is
        // currently used by quickpics-server on this host — pick something
        // else (e.g. 7000) until that container is moved or stopped.
        FRONTEND_HOST_PORT = '7000'
        BACKEND_HOST_PORT  = '5000'

        // ---- Backend container envs ----
        NODE_ENV = 'production'
        PORT     = '5000'

        // ---- PostgreSQL credentials (consumed by docker-compose.yaml) ----
        // TODO: replace with Jenkins credentials() bindings for real deployments.
        POSTGRES_USER     = 'peopleflow'
        POSTGRES_PASSWORD = 'peopleflow'
        POSTGRES_DB       = 'peopleflow'

        // ---- JWT (also consumed by docker-compose.yaml) ----
        // TODO: replace with a Jenkins secret-text credential in prod.
        JWT_SECRET     = 'change-me-to-a-long-random-string-in-production'
        JWT_EXPIRES_IN = '7d'

        // Stable project name so containers always get the same names.
        COMPOSE_PROJECT_NAME = 'peopleflow'
    }

    stages {

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
# --- Postgres ---
POSTGRES_USER=${POSTGRES_USER}
POSTGRES_PASSWORD=${POSTGRES_PASSWORD}
POSTGRES_DB=${POSTGRES_DB}

# --- JWT ---
JWT_SECRET=${JWT_SECRET}
JWT_EXPIRES_IN=${JWT_EXPIRES_IN}

# --- Host port mappings ---
FRONTEND_HOST_PORT=${FRONTEND_HOST_PORT}
BACKEND_HOST_PORT=${BACKEND_HOST_PORT}

# --- Misc ---
CORS_ORIGIN=
EOF

                echo ".env written:"
                sed 's/=.*/=***/' .env
                '''
            }
        }

        stage('Build & Deploy') {
            steps {
                sh '''
                set -e

                docker compose down --remove-orphans || true

                # Use the build cache for speed. Switch to --no-cache only when
                # you really need a clean rebuild (e.g. base-image security patch).
                docker compose build

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
                        echo "Backend reported unhealthy."
                        docker compose logs backend
                        exit 1
                    fi

                    sleep 5
                done

                echo "Backend failed to become healthy within timeout."
                docker compose logs
                exit 1
                '''
            }
        }

        stage('Verify Containers') {
            steps {
                sh 'docker compose ps'
            }
        }
    }

    post {

        success {
            echo "Deployment Successful"
            echo "Frontend : http://${VM_HOST}:${FRONTEND_HOST_PORT}"
            echo "Backend  : http://${VM_HOST}:${BACKEND_HOST_PORT}/api/health"
        }

        failure {
            echo "Deployment Failed"
            sh '''
            docker compose logs --tail=200 || true
            docker compose ps           || true
            '''
        }

        always {
            sh 'docker ps -a'
        }
    }
}
