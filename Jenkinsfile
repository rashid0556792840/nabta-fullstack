// Jenkins pipeline (Unit 5): checks the code before it is pushed/deployed.
// Create a "Pipeline" job in Jenkins -> "Pipeline script from SCM" -> your Git repo -> Script Path: Jenkinsfile
// Requires Node.js 20+ on the Jenkins machine (and a JDK if you use the Tomcat stage on Linux).
pipeline {
  agent any

  parameters {
    booleanParam(name: 'DEPLOY_TO_TOMCAT', defaultValue: false, description: 'Copy nabta.war into the local Tomcat webapps folder')
    string(name: 'TOMCAT_HOME', defaultValue: 'C:\\apache-tomcat-10.1', description: 'Tomcat install folder (used when deploying)')
  }

  stages {
    stage('Checkout') {
      steps {
        checkout scm
      }
    }

    stage('Backend: install') {
      steps {
        dir('server') { runCmd('npm ci') }
      }
    }

    stage('Backend: syntax check') {
      steps {
        // node --check parses every file without running it
        dir('server') { runCmd('node --check src/server.js && node --check src/app.js && node --check scripts/seed.js') }
      }
    }

    stage('Backend: unit tests') {
      steps {
        dir('server') { runCmd('npm test') }
      }
    }

    stage('Frontend: install & build') {
      steps {
        dir('client') {
          runCmd('npm ci')
          runCmd('npm run build')
        }
      }
    }

    stage('Package WAR for Tomcat') {
      steps {
        script {
          if (isUnix()) {
            sh 'sh deploy/build-war.sh'
          } else {
            bat 'powershell -NoProfile -ExecutionPolicy Bypass -File deploy\\build-war.ps1'
          }
        }
        archiveArtifacts artifacts: 'deploy/nabta.war', fingerprint: true
      }
    }

    stage('Deploy to local Tomcat') {
      when { expression { return params.DEPLOY_TO_TOMCAT } }
      steps {
        script {
          if (isUnix()) {
            sh "cp deploy/nabta.war '${params.TOMCAT_HOME}/webapps/nabta.war'"
          } else {
            bat "copy /Y deploy\\nabta.war \"${params.TOMCAT_HOME}\\webapps\\nabta.war\""
          }
        }
        echo 'Deployed. Open http://localhost:8080/nabta/'
      }
    }
  }

  post {
    success { echo 'All checks passed - safe to push.' }
    failure { echo 'Checks failed - fix the errors above before pushing.' }
  }
}

// Runs a shell command on Linux/macOS agents and a batch command on Windows agents
def runCmd(String command) {
  if (isUnix()) {
    sh command
  } else {
    bat command
  }
}
