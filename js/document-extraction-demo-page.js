/**
 * Document extraction demo (/services/document-extraction-demo.html).
 * Live extraction via Netlify function + OpenAI; client-side fallbacks for validation and offline demo.
 */
(function () {
  "use strict";

  const MAX_FILES = 5;
  const MAX_FILE_SIZE = 4 * 1024 * 1024;
  let uploadedFiles = [];

  const uploadArea = document.getElementById("uploadArea");
  const fileInput = document.getElementById("fileInput");
  const fileList = document.getElementById("fileList");
  const uploadFeedback = document.getElementById("uploadFeedback");
  const extractBtn = document.getElementById("extractBtn");

  uploadArea.addEventListener("click", () => fileInput.click());
  uploadArea.addEventListener("keydown", e => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      fileInput.click();
    }
  });

  function setFeedback(message, kind) {
    if (!uploadFeedback) return;
    uploadFeedback.hidden = !message;
    uploadFeedback.textContent = message || "";
    uploadFeedback.className = "jl-upload-feedback";
    if (kind === "error") uploadFeedback.classList.add("jl-upload-feedback--error");
    else if (kind === "success") uploadFeedback.classList.add("jl-upload-feedback--success");
  }

  function extensionOf(name) {
    const n = String(name || "").toLowerCase();
    const i = n.lastIndexOf(".");
    return i >= 0 ? n.slice(i + 1) : "";
  }

  function isAllowedDoc(file) {
    const ext = extensionOf(file.name);
    if (ext === "pdf" || ext === "docx" || ext === "doc") return true;
    const mt = (file.type || "").toLowerCase();
    return (
      mt === "application/pdf" ||
      mt === "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
      mt === "application/msword"
    );
  }

  function readFileAsBase64(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const dataUrl = reader.result;
        if (typeof dataUrl !== "string") {
          reject(new Error("Could not read file."));
          return;
        }
        const i = dataUrl.indexOf("base64,");
        resolve(i >= 0 ? dataUrl.slice(i + 7) : dataUrl);
      };
      reader.onerror = () => reject(new Error("Could not read file."));
      reader.readAsDataURL(file);
    });
  }

  uploadArea.addEventListener("dragover", e => {
    e.preventDefault();
    uploadArea.classList.add("dragover");
  });

  uploadArea.addEventListener("dragleave", () => {
    uploadArea.classList.remove("dragover");
  });

  uploadArea.addEventListener("drop", e => {
    e.preventDefault();
    uploadArea.classList.remove("dragover");
    handleFiles(e.dataTransfer.files);
  });

  fileInput.addEventListener("change", e => {
    handleFiles(e.target.files);
    e.target.value = "";
  });

  function handleFiles(fileListLike) {
    const incoming = Array.from(fileListLike || []);
    const accepted = [];
    const rejected = [];

    for (const file of incoming) {
      if (!isAllowedDoc(file)) {
        rejected.push(file.name + " (use PDF, DOCX, or DOC)");
        continue;
      }
      if (file.size > MAX_FILE_SIZE) {
        rejected.push(file.name + " (over 4MB demo limit)");
        continue;
      }
      accepted.push(file);
    }

    if (rejected.length) {
      setFeedback(rejected.join(" "), "error");
    } else {
      setFeedback("", "");
    }

    let combined = uploadedFiles.concat(accepted);
    if (combined.length > MAX_FILES) {
      setFeedback(
        `Demo limit: maximum ${MAX_FILES} files. Extra files were not added.`,
        "error"
      );
      combined = combined.slice(0, MAX_FILES);
    }

    uploadedFiles = combined;
    updateFileList();
    updateExtractButton();
  }

  function updateFileList() {
    fileList.innerHTML = "";
    uploadedFiles.forEach((file, index) => {
      const row = document.createElement("div");
      row.className = "file-item";
      const left = document.createElement("div");
      const strong = document.createElement("strong");
      strong.textContent = file.name;
      const small = document.createElement("small");
      small.className = "text-muted d-block";
      small.textContent = (file.size / 1024).toFixed(2) + " KB";
      left.appendChild(strong);
      left.appendChild(small);
      const rm = document.createElement("button");
      rm.type = "button";
      rm.className = "btn btn-sm btn-danger";
      rm.setAttribute("data-remove-index", String(index));
      rm.textContent = "Remove";
      row.appendChild(left);
      row.appendChild(rm);
      fileList.appendChild(row);
    });
  }

  fileList.addEventListener("click", e => {
    const btn = e.target.closest("[data-remove-index]");
    if (!btn) return;
    const i = Number(btn.getAttribute("data-remove-index"));
    if (Number.isFinite(i)) removeFile(i);
  });

  function removeFile(index) {
    uploadedFiles.splice(index, 1);
    updateFileList();
    updateExtractButton();
  }

  window.clearFiles = function clearFiles() {
    uploadedFiles = [];
    updateFileList();
    updateExtractButton();
    document.getElementById("resultsSection").style.display = "none";
    document.getElementById("processingStatus").style.display = "none";
    setFeedback("", "");
  };

  function updateExtractButton() {
    extractBtn.disabled = uploadedFiles.length === 0;
  }

  function displaySimulatedResults() {
    const docInfo = {
      totalFiles: uploadedFiles.length,
      filesProcessed: uploadedFiles.length,
      mode: "Sample preview (not your file contents)",
      extractionMethod: "Static demo layout"
    };

    document.getElementById("docInfo").textContent = JSON.stringify(docInfo, null, 2);

    const sampleExtractedData = {
      documentType: "Invoice",
      vendor: "ABC Supplies Inc.",
      invoiceNumber: "INV-2024-001234",
      date: "2024-12-15",
      dueDate: "2025-01-15",
      totalAmount: "$4,567.89",
      lineItems: [
        {
          description: "Office Supplies",
          quantity: 50,
          unitPrice: "$45.00",
          total: "$2,250.00"
        },
        {
          description: "Software Licenses",
          quantity: 3,
          unitPrice: "$599.99",
          total: "$1,799.97"
        }
      ],
      paymentTerms: "Net 30",
      billingAddress: "123 Business St, City, ST 12345"
    };

    document.getElementById("keyInformation").textContent =
      "NOTE: This is sample text so you can see the layout. Live AI reads your actual first file when the server is configured.\n\n" +
      `Your uploaded file name(s): ${uploadedFiles.map(f => f.name).join(", ")}\n\n` +
      `Document Type: ${sampleExtractedData.documentType}
Vendor: ${sampleExtractedData.vendor}
Invoice Number: ${sampleExtractedData.invoiceNumber}
Invoice Date: ${sampleExtractedData.date}
Due Date: ${sampleExtractedData.dueDate}
Total Amount: ${sampleExtractedData.totalAmount}
Payment Terms: ${sampleExtractedData.paymentTerms}

Line Items:
${sampleExtractedData.lineItems
  .map(
    item =>
      `  • ${item.description}: ${item.quantity} × ${item.unitPrice} = ${item.total}`
  )
  .join("\n")}

Billing Address: ${sampleExtractedData.billingAddress}`;

    document.getElementById("documentSummary").textContent =
      "Sample summary only (not from your document):\n\n" +
      "This reads as an invoice from ABC Supplies Inc. dated December 15, 2024, totaling $4,567.89, with Net 30 terms.\n\n" +
      "Suggested actions (sample):\n" +
      "• Add to accounts payable\n" +
      "• Schedule payment for due date\n" +
      "• Verify line items against purchase order";
  }

  function displayLiveResults(apiBody, allFiles) {
    const s = apiBody.structured || {};
    const docInfo = {
      totalFiles: allFiles.length,
      filesAnalyzedWithLiveAI: 1,
      firstFileName: allFiles[0] && allFiles[0].name,
      otherQueuedFiles:
        allFiles.length > 1 ? allFiles.slice(1).map(f => f.name) : undefined,
      modelUsed: apiBody.modelUsed,
      mode: "Live AI extraction"
    };
    document.getElementById("docInfo").textContent = JSON.stringify(docInfo, null, 2);

    const fields = s.keyFields && typeof s.keyFields === "object" ? s.keyFields : {};
    const lines = Object.keys(fields).length
      ? Object.entries(fields)
          .map(([k, v]) => `${k}: ${v}`)
          .join("\n")
      : "(No key fields returned)";

    document.getElementById("keyInformation").textContent =
      `Document type: ${s.documentType || "Unknown"}
Confidence: ${s.confidence || "unknown"}

Extracted fields:
${lines}`;

    const actions = Array.isArray(s.suggestedActions)
      ? s.suggestedActions.map(a => `• ${a}`).join("\n")
      : "";
    document.getElementById("documentSummary").textContent =
      (s.summary || "No summary returned.") +
      (actions ? `\n\nSuggested actions:\n${actions}` : "");
  }

  window.startExtraction = async function startExtraction() {
    if (uploadedFiles.length === 0) return;

    document.getElementById("processingStatus").style.display = "block";
    document.getElementById("resultsSection").style.display = "none";
    extractBtn.disabled = true;
    setFeedback("", "");

    let showResults = false;
    try {
      const file = uploadedFiles[0];
      const fileBase64 = await readFileAsBase64(file);
      const standardBody = JSON.stringify({
        filename: file.name,
        mimeType: file.type || "",
        fileBase64
      });
      const chatbotBody = JSON.stringify({
        jlDocumentExtractionDemo: true,
        filename: file.name,
        mimeType: file.type || "",
        fileBase64
      });

      const attempts = [
        { url: "/.netlify/functions/chatbot", body: chatbotBody },
        { url: "/api/document-extraction-demo", body: standardBody },
        { url: "/.netlify/functions/document-extraction-demo", body: standardBody }
      ];

      let res = null;
      let data = {};
      for (const { url, body } of attempts) {
        res = await fetch(url, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body
        });
        data = await res.json().catch(() => ({}));
        if (res.ok && data.ok && data.structured) break;
        if (res.status === 413 || res.status === 400) break;
      }

      if (res.status === 413 || res.status === 400) {
        setFeedback(
          data.error || (res.status === 413 ? "File too large for this demo." : "Request not accepted."),
          "error"
        );
      } else if (res.ok && data.ok && data.structured) {
        displayLiveResults(data, uploadedFiles);
        showResults = true;
        if (uploadedFiles.length > 1) {
          setFeedback(
            "Live AI analyzed your first file only in this demo. Remove extras or run again after clearing.",
            "success"
          );
        }
      } else {
        let hint =
          data.code === "missing_api_key"
            ? "Live AI is not configured on this deployment yet."
            : data.error || `Request failed (${res.status})`;
        if (res.status === 405 || res.status === 404) {
          hint +=
            " Static previews (for example `npm start` or some live-preview servers) cannot run Netlify Functions. From the repo root run `netlify dev` and open the URL it prints, or use your deployed Netlify site.";
        }
        setFeedback(hint + " Showing sample layout below.", "error");
        displaySimulatedResults();
        showResults = true;
      }
    } catch (err) {
      console.error("[doc-demo]", err);
      setFeedback(
        (err && err.message) ||
          "Network error. Showing sample layout below.",
        "error"
      );
      displaySimulatedResults();
      showResults = true;
    } finally {
      document.getElementById("processingStatus").style.display = "none";
      if (showResults) {
        document.getElementById("resultsSection").style.display = "block";
        document
          .getElementById("resultsSection")
          .scrollIntoView({ behavior: "smooth" });
      }
      extractBtn.disabled = uploadedFiles.length === 0;
    }
  };

  window.downloadResults = function downloadResults() {
    let documentInfo = {};
    try {
      documentInfo = JSON.parse(
        document.getElementById("docInfo").textContent || "{}"
      );
    } catch {
      documentInfo = { parseError: true };
    }
    const results = {
      documentInfo,
      keyInformation: document.getElementById("keyInformation").textContent,
      documentSummary: document.getElementById("documentSummary").textContent,
      extractedAt: new Date().toISOString(),
      demo: true
    };

    const blob = new Blob([JSON.stringify(results, null, 2)], {
      type: "application/json"
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `extraction-results-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  window.tryAnother = function tryAnother() {
    window.clearFiles();
    document.getElementById("resultsSection").style.display = "none";
  };
})();
