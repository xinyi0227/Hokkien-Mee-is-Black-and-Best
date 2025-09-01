# Hokkien Mee is Black and Best 🍜

<div align="center">
  <p><em>EaSys - A scalable business analytics platform with AI-driven workflows and intelligent monitoring</em></p>
</div>

<div align="center">
  <img src="https://img.shields.io/badge/Django-092E20?style=for-the-badge&logo=django&logoColor=white" />
  <img src="https://img.shields.io/badge/React-20232A?style=for-the-badge&logo=react&logoColor=61DAFB" />
  <img src="https://img.shields.io/badge/Node.js-43853D?style=for-the-badge&logo=node.js&logoColor=white" />
  <img src="https://img.shields.io/badge/TypeScript-007ACC?style=for-the-badge&logo=typescript&logoColor=white" />
  <img src="https://img.shields.io/badge/Supabase-3ECF8E?style=for-the-badge&logo=supabase&logoColor=white" />
</div>

## 👥 Team Members

| Name             | Role                                    | GitHub                                         |
| ---------------- | --------------------------------------- | ---------------------------------------------- |
| **Lim Xin Yi**   | System Architect & MCP Server Developer | [@xinyi0227](https://github.com/xinyi0227)     |
| **Li Yi Ting**   | Backend Developer                       | [@LiYiTing04](https://github.com/LiYiTing04)   |
| **Chin Yu Xuan** | Frontend Developer                      | [@Chinyuxuan](https://github.com/Chinyuxuan)   |
| **Tok Pei Ying** | Backend Developer                       | [@liona8](https://github.com/liona8)           |
| **Lau Yong Pin** | Frontend Developer                      | [@feeder11223](https://github.com/feeder11223) |

## 🚀 Problem and Solution Summary

### The Challenge

Modern businesses need sophisticated analytics platforms that can handle complex AI-driven workflows while maintaining high performance and scalability. Our project addresses three critical challenges:

**🔴 Performance Bottlenecks**

- Heavy AI processing tasks were blocking Django API responses
- Complex data analysis causing 30+ second request timeouts
- Monolithic architecture limiting horizontal scaling

**🔴 Complex Workflow Management**

- Multi-step processes: file upload → data cleaning → AI analysis → report generation
- Manual monitoring of system health across multiple services
- Inconsistent error handling across different processing stages

**🔴 Development & Monitoring Challenges**

- Schema mismatches between React frontend and Django backend
- Lack of real-time validation for API endpoints and database health
- Difficulty debugging distributed system issues

### Our Innovative Solution

We developed a **hybrid microservices architecture** that combines the best of monolithic stability with microservices scalability:

**🟢 MCP (Model Context Protocol) Server**

- Offloaded CPU-intensive AI tasks to async Node.js microservices
- Built 12 custom MCP tools for automated system monitoring
- Achieved 90%+ performance improvement in API response times

**🟢 Intelligent Workflow Orchestration**

- Modularized complex business processes into reusable MCP tools
- Implemented real-time health monitoring across all services
- Created automated report generation with AI-powered insights

**🟢 Developer Experience Enhancement**

- VS Code integration with MCP tools for seamless development workflow
- Comprehensive API validation and schema synchronization
- Proactive monitoring preventing issues before they impact users

## ✨ Key Features

### 🎯 Core Business Features

- **📊 Business Data Analytics** - AI-powered insights and visualizations
- **🎙️ Meeting Management** - Transcription, summarization, and task extraction
- **📝 Complaint Resolution** - Automated sentiment analysis and solution generation
- **📈 Report Generation** - Automated PDF/PPT creation with charts
- **👥 User Management** - Secure authentication via Supabase
- **📱 Responsive Design** - Works seamlessly across all devices

## 🛠 Technology Stack

### Backend

- **🐍 Django 4.2** - REST API framework with PostgreSQL
- **🔐 Django REST Framework** - API serialization and authentication
- **🗄️ PostgreSQL** - Primary relational database
- **☁️ Supabase** - Authentication, file storage, and real-time features

### Frontend

- **⚛️ React 18** - Modern UI with hooks and functional components
- **🛣️ React Router** - Client-side routing and navigation
- **📡 Axios** - HTTP client for API communication
- **🎨 CSS Modules** - Responsive and modular styling

### MCP Microservices

- **🚀 Node.js 18+** - High-performance JavaScript runtime
- **📘 TypeScript** - Type-safe development
- **🔧 Model Context Protocol SDK** - Custom tool integration
- **🛠️ 12 Custom MCP Tools** - Automated monitoring and validation

### AI & Analytics

- **🤖 Google Gemini API** - Advanced text analysis and summarization
- **📊 Custom Data Processing** - Business intelligence algorithms
- **📈 Automated Reporting** - PDF/PPT generation with charts and visualizations

### DevOps & Development

- **💻 VS Code** - Primary development environment with MCP extension
- **📝 Git** - Version control and collaboration
- **🔄 Environment Configuration** - Multi-stage deployment setup

## 📋 Setup Instructions

### Prerequisites

- ✅ Python 3.10+
- ✅ Node.js 18+
- ✅ VS Code with GitHub Copilot
- ✅ Git for version control
- ✅ Supabase account
- ✅ Google Gemini API key

### 1. Repository Setup

```bash
git clone https://github.com/yourusername/Hokkien-Mee-is-Black-and-Best.git
cd Hokkien-Mee-is-Black-and-Best
```

### 2. Backend Setup (Django)

```bash
cd backend
python -m venv venv
```

Windows

```bash
venv\Scripts\activate
```

macOS/Linux

```bash
source venv/bin/activate
```

Install dependencies

```bash
pip install -r requirements.txt
```

Environment configuration

```bash
cp .env.example .env
```

Edit .env file with your credentials:

```bash
SUPABASE_URL=your_supabase_project_url
SUPABASE_KEY=your_supabase_anon_key
GEMINI_API_KEY=your_gemini_api_key
```

Database setup

```bash
python manage.py migrate
python manage.py collectstatic
```

Start Django server

```bash
python manage.py runserver
```

### 3. Frontend Setup (React)

```bash
cd frontend
```

Install dependencies

```bash
npm install
```

Start development server

```bash
npm start
```

Application will be available at http://localhost:3000

### 4. MCP Server Setup (Node.js)

```bash
cd mcp-server
```

Install dependencies

```bash
npm install
```

Build TypeScript

```bash
npm run build
```

Set environment variables

```bash
export SUPABASE_URL=your_supabase_project_url
export SUPABASE_KEY=your_supabase_anon_key
export GEMINI_API_KEY=your_gemini_api_key
```

Start MCP server

```bash
node dist/server.js
```

You should see: "Enhanced Project Tools MCP Server v2.0 running on stdio"

### 5. VS Code MCP Integration

1. **Create MCP Configuration**

   ```bash
   mkdir -p .vscode
   ```

2. **Create `.vscode/mcp.json`**

   ```bash
    {
      "servers": {
          "project-tools": {
              "command": "node",
              "args": ["dist/server.js"],
              "cwd": "./mcp-server",
              "env": {
                  "SUPABASE_URL": "your_supabase_project_url",
                  "SUPABASE_KEY": "your_supabase_anon_key",
                  "GEMINI_API_KEY": "your_gemini_api_key"
              }
          }
      }
    }
   ```

3. **Restart VS Code**
   Close and reopen VS Code completely

   ```bash
   code .
   ```

4. **Test MCP Integration**

- Open Copilot Chat (`Ctrl+Shift+I`)
- Test your MCP tools:

```bash
  @agent Use drfSchemaValidator
  @agent Use djangoHealthCheck
  @agent Use deploymentCheck
```

### 6. Verify Everything is Working

Backend health check

```bash
curl http://localhost:8000/api/meetings/
```

Frontend accessible

```bash
curl http://localhost:3000
```

MCP server running
Check VS Code -> View -> Output -> MCP Servers

## 🏗️ Project Architecture

<div align="center">
<table>
  <tr>
    <td align="center"><strong>Frontend</strong></td>
    <td align="center"><strong>Backend API</strong></td>
    <td align="center"><strong>MCP Server</strong></td>
  </tr>
  <tr>
    <td align="center">
      <img src="https://img.shields.io/badge/React-20232A?style=flat-square&logo=react&logoColor=61DAFB" /><br>
      React.js Frontend<br>
      Components & UI
    </td>
    <td align="center">
      <img src="https://img.shields.io/badge/Django-092E20?style=flat-square&logo=django&logoColor=white" /><br>
      Django REST API<br>
      Business Logic
    </td>
    <td align="center">
      <img src="https://img.shields.io/badge/Node.js-43853D?style=flat-square&logo=node.js&logoColor=white" /><br>
      MCP Server<br>
      AI Processing
    </td>
  </tr>
  <tr>
    <td colspan="3" align="center">
      <strong>↕️ Data Flow ↕️</strong>
    </td>
  </tr>
  <tr>
    <td align="center">
      <img src="https://img.shields.io/badge/PostgreSQL-316192?style=flat-square&logo=postgresql&logoColor=white" /><br>
      PostgreSQL<br>
      Database
    </td>
    <td align="center">
      <img src="https://img.shields.io/badge/Supabase-3ECF8E?style=flat-square&logo=supabase&logoColor=white" /><br>
      Supabase<br>
      Storage & Auth
    </td>
    <td align="center">
      <img src="https://img.shields.io/badge/Google%20AI-4285F4?style=flat-square&logo=google&logoColor=white" /><br>
      Gemini AI<br>
      Processing
    </td>
  </tr>
</table>
</div>

<div align="center">
  <p><strong>Data Flow:</strong> React ↔️ Django API ↔️ MCP Server ↔️ AI Services</p>
</div>

## 📊 Performance Metrics

### Before MCP Integration

- ⏱️ API response time: 15-30 seconds for AI tasks
- 🔄 Request blocking: Heavy processing blocked other requests
- 📈 Error rate: 12% timeout errors during peak usage

### After MCP Integration

- ⚡ API response time: 200-500ms for standard requests
- 🔄 Non-blocking: AI processing runs asynchronously
- 📉 Error rate: <2% with improved error handling
- 🚀 Performance improvement: 90%+ faster response times

## 🎯 Reflection on Challenges and Learning

### 🔴 Major Challenges Encountered

**1. Architecture Design Complexity**

- **Challenge**: Deciding how to split functionality between Django and MCP server
- **Solution**: Implemented strategic separation - Django for CRUD operations, MCP for heavy processing
- **Learning**: Microservices should be purpose-driven, not technology-driven

**2. Performance Bottlenecks**

- **Challenge**: AI processing was causing 30+ second API timeouts
- **Solution**: Offloaded all AI tasks to async MCP server with proper queue management
- **Learning**: User experience is paramount - never block user interfaces for background processing

**3. Cross-Service Communication**

- **Challenge**: Maintaining data consistency across Django, React, and MCP services
- **Solution**: Implemented comprehensive API contracts and automated validation tools
- **Learning**: Investment in monitoring and validation tools prevents production issues

**4. Development Workflow Integration**

- **Challenge**: Managing three different development environments efficiently
- **Solution**: VS Code MCP integration created seamless developer experience
- **Learning**: Developer experience directly impacts code quality and team productivity

### 🟢 Key Technical Learnings

**System Architecture:**

- **Hybrid Architecture Benefits**: Combining monolithic stability with microservices flexibility
- **Strategic Offloading**: Not everything needs to be a microservice - strategic extraction works best
- **Monitoring-First Approach**: Building observability alongside features prevents technical debt

**Technology Integration:**

- **Django Best Practices**: REST API design, serialization optimization, database query optimization
- **React Performance**: Component optimization, state management, efficient rendering patterns
- **Node.js Async Patterns**: Promise handling, error propagation, memory management
- **TypeScript Benefits**: Type safety significantly reduced runtime errors and improved maintainability

**AI Integration:**

- **API Rate Limiting**: Proper handling of external AI service limitations
- **Error Recovery**: Graceful fallbacks when AI services are unavailable
- **Data Processing**: Efficient handling of large datasets for AI analysis
- **Result Caching**: Optimizing AI service costs through intelligent caching

---

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

<div align="center">
  <p><strong>🍜 Built with ❤️ and lots of ☕ by the Hokkien Mee Team</strong></p>
  <p><em>"Hokkien Mee is black, and that's what makes it the best - just like our scalable, robust architecture!"</em></p>
</div>
