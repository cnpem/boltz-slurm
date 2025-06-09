# Boltz GUI

A user-friendly web interface for running Boltz-2 predictions with visualizations and streamlined workflows for protein-ligand co-folding and binding affinity prediction.

My reason for making this is because Biology is a beautiful field and it's software should be beautiful too.

Feel free to use and modify this for your own purposes. In the first iteration, I have made this only for local use. If someone has GPUs and would like to host it for others to try, please reach out to me.

If you have any suggestions or feedback please feel free to open an issue or reach out to me.

**Boltz-2** is a revolutionary biomolecular foundation model developed by researchers at MIT and Recursion that approaches the accuracy of physics-based FEP methods while running 1000x faster, making accurate in silico screening practical for early-stage drug discovery.

## 🚀 Features

### **Intuitive Job Management**
- Custom job naming for easy organization
- Real-time job monitoring and status tracking
- Comprehensive job history with search and filtering
- Automatic result processing and storage

### **Advanced Prediction Capabilities**
- **Protein-Ligand Co-folding**: Joint structure and binding affinity prediction
- **Multiple Input Types**: Support for proteins, DNA, RNA, and ligands
- **Advanced Constraints**: Bond, pocket, and contact constraints for guided predictions
- **Template Support**: Use experimental structures as templates

### **Rich Visualizations**
- **3D Structure Viewer**: Interactive molecular visualization with Molstar
- **Binding Affinity Analysis**: Comprehensive IC50 and binding strength predictions
- **Confidence Scoring**: Detailed confidence metrics and quality assessments
- **Results Interpretation**: Built-in guides for understanding predictions

## 🧬 About Boltz-2

Boltz-2 is the first deep learning model to approach FEP-level accuracy in binding affinity prediction while being:

- **1000x Faster** than traditional FEP methods
- **Highly Accurate** - comparable to OpenFE/FEP+ workflows
- **Broadly Adopted** - used by thousands of scientists across leading academic labs and all 20 largest pharmaceutical companies
- **Open Source** - released under MIT license for academic and commercial use

**Key Achievements:**
- Outperformed all methods in the CASP16 affinity challenge
- Approaches the accuracy of physics-based free-energy perturbation methods
- Enables practical large-scale virtual screening for drug discovery

## 📚 References

- **Original Boltz Repository**: https://github.com/jwohlwend/boltz/
- **Boltz-2 Paper**: https://cdn.prod.website-files.com/68404fd075dba49e58331ad9/6842ee1285b9af247ac5a122_boltz2.pdf

## 🏗️ Architecture

- **Frontend**: React + Vite + Tailwind CSS (`/frontend`)
  - Modern, responsive web interface
  - Real-time job monitoring
  - Interactive 3D molecular visualization
  - Comprehensive results analysis

- **Backend**: FastAPI + Python (`/backend`)
  - RESTful API for job management
  - Integration with Boltz-2 prediction engine
  - Structured data storage and retrieval
  - Real-time job status updates

## 🚀 Quick Start

### Prerequisites

- **Python 3.12+** with `uv` package manager
- **Node.js 18+** with npm

### Backend Setup

```bash
cd backend
uv sync
source .venv/bin/activate # or .venv/Scripts/activate on Windows
uv run run_server.py
```

The backend API will be available at http://localhost:6969

### Frontend Setup

```bash
cd frontend
npm install
npm run dev
```

The web interface will be available at http://localhost:6868

### Access the Application

Open your browser and navigate to http://localhost:6868 to access the Boltz GUI.

## 💻 Usage

### 1. **Landing Page**
Start at the landing page which provides an overview of Boltz-2 capabilities and features.

### 2. **Create New Job**
- Click "Try Boltz-2 Now" or "+ New Job"
- **Quick Start**: Load pre-configured examples for different prediction types
- Provide an optional job name for easy identification
- Add protein and ligand sequences
- Configure prediction properties (binding affinity, etc.)
- Optionally add advanced constraints or templates

### 3. **Monitor Progress**
- Real-time job status updates in the sidebar
- Automatic polling for completion
- View running jobs and their progress

### 4. **Analyze Results**
- Interactive 3D structure visualization
- Comprehensive binding affinity analysis
- Detailed confidence metrics
- Built-in interpretation guides

### 5. **Download Results**
- Download 3D structures (PDB format)
- Export prediction results (JSON format)
- Download complete archives (ZIP with all files)
- Quick download from sidebar for completed jobs

## 📖 Example Templates

The interface includes six pre-configured examples to help you get started:

1. **Protein-Ligand Affinity**: Predict binding affinity between protein and small molecule
2. **Cyclic Protein**: Structure prediction for cyclic peptides
3. **Multiple Ligands**: Protein with multiple ligands using CCD codes and SMILES
4. **Protein Multimer**: Complex structure prediction for protein assemblies
5. **Single Protein**: Simple protein structure prediction



## 📁 Project Structure

```
boltz-gui/
├── frontend/                 # React frontend application
│   ├── src/
│   │   ├── components/      # React components
│   │   ├── assets/          # Static assets
│   │   └── index.css        # Tailwind CSS styles
│   └── package.json
├── backend/                 # FastAPI backend
│   ├── app.py              # Main application file
│   ├── jobs/               # Job storage directory
│   └── pyproject.toml
└── README.md
```

## Acknowledgments

- **Boltz Team** at MIT Jameel Clinic and Recursion for developing Boltz-2
- **Original Boltz Repository**: https://github.com/jwohlwend/boltz/
- **Molstar** for 3D molecular visualization capabilities
- **Cursor** for helping me bring this to life quickly, especially the frontend.


