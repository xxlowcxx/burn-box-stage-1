# Research Bibliography — Burn Box Stage 1

This bibliography collects academic work that informed (or is directly relevant to evaluating) the Stage 1 SafeDrive prototype: a read-only file vault that runs uploaded files through a pattern-based safety scan, produces a sanitized "safe copy," and deletes the original.

We do not redistribute PDFs here — only citations with links to the original open-access source, plus a short note on relevance. Full text is available at each URL.

## Content Disarm & Reconstruction (CDR) — the technique closest to Stage 1's approach

1. **Gilkarov, D. & Dubin, R. (2025).** "Zero-Trust Artificial Intelligence Model Security Based on Moving Target Defense and Content Disarm and Reconstruction." arXiv:2503.01758. [https://arxiv.org/abs/2503.01758](https://arxiv.org/abs/2503.01758)
   *Relevance:* Demonstrates CDR against serialization attacks in ML model files (Pickle/PyTorch) with a reported 100% disarm rate on tested samples. Stage 1's "sanitize and rewrap" pipeline for text files is a simplified, pattern-based analog of this approach — this paper is the target architecture to grow into for Stage 2+.

2. **Belkind, E., Dubin, R. & Dvir, A. (2023).** "Open Image Content Disarm And Reconstruction." arXiv:2307.14057. [https://arxiv.org/abs/2307.14057](https://arxiv.org/abs/2307.14057)
   *Relevance:* Directly applicable to Stage 1's binary/image handling gap — proposes pixel-level extraction and reconstruction to strip steganographic payloads from JPEGs while preserving usability. Stage 1 currently only checks binary file size/MIME type for images; this is the reference design for real image CDR in a later stage.

3. **Jung, D-S., Euom, I-C. & Lee, S-J. (2020).** "ImageDetox: Method for the Neutralization of Malicious Code Hidden in Image Files." *Symmetry*, 12(10), 1621. [https://www.mdpi.com/2073-8994/12/10/1621/pdf](https://www.mdpi.com/2073-8994/12/10/1621/pdf)
   *Relevance:* Neutralizes malicious code embedded in image files without prior signature knowledge — same zero-trust philosophy Stage 1 aims for (treat unknown content as unsafe by default, rebuild rather than merely block).

4. **Li, Y., Gong, L., Li, A. & Shen, Y. (2025).** "Design and Implementation of a Security Control System for USB Removable Media in Power Equipment." IEEE PoSEI 2025. [https://ieeexplore.ieee.org/document/11382359](https://ieeexplore.ieee.org/document/11382359)
   *Relevance:* Real-world deployed system combining multi-engine malware scanning with CDR at a network boundary. Useful reference for the "isolation gateway" pattern (quarantine → scan → sanitize copy) Stage 1 implements at a single-server scale.

## Unrestricted file upload & web-facing scanning

5. **Neef, S. & Oudeh, M. (2024).** "Bringing UFUs Back into the Air With FUEL: A Framework for Evaluating the Effectiveness of Unrestricted File Upload Vulnerability Scanners." arXiv:2405.16619. [https://arxiv.org/abs/2405.16619](https://arxiv.org/abs/2405.16619)
   *Relevance:* Directly describes the threat class Stage 1's upload endpoint must defend against (unrestricted/insufficiently validated file upload) and a framework for evaluating scanner effectiveness — a good candidate test harness for Stage 2 QA.

6. **Wang, C., Duan, H., Zhang, H., Zhang, J., Chen, J., Zhuge, J. & Wang, Q. (2024).** "Inbox Invasion: Exploiting MIME Ambiguities to Evade Email Attachment Detectors." ACM CCS 2024. [https://dl.acm.org/doi/pdf/10.1145/3658644.3670386](https://dl.acm.org/doi/pdf/10.1145/3658644.3670386)
   *Relevance:* Shows how MIME-type ambiguity is used to evade attachment detectors — a direct limitation of Stage 1's current MIME-based branching logic (text vs. binary vs. unknown) that should be hardened with magic-byte/content sniffing in Stage 2.

## Sandboxing & isolation theory

7. **Sales, A., Chung, B., Sunshine, J. & Maass, M. (2016).** "A systematic analysis of the science of sandboxing." *PeerJ Computer Science*, 2:e43. [https://peerj.com/articles/cs-43.pdf](https://peerj.com/articles/cs-43.pdf)
   *Relevance:* Surveys what sandboxing claims are and aren't empirically supported. Useful check on Stage 1's "quarantine" step — currently a plain temp directory, not a hardened sandbox — and a guide for what evidence would be needed to call it one.

8. **Nappa, A., Papadopoulos, P., Varvello, M., Aceituno Gomez, D., Tapiador, J. & Lanzi, A. (2021).** "POW-HOW: An enduring timing side-channel to evade online malware sandboxes." arXiv:2109.02979. [https://arxiv.org/abs/2109.02979](https://arxiv.org/abs/2109.02979)
   *Relevance:* Documents evasion techniques against automated malware sandboxes, underscoring why Stage 1's synchronous pattern-scan (no behavioral/dynamic analysis) cannot be marketed as sandbox-grade protection.

## AI/ML-based malware detection (context for future stages)

9. **Janicke, H., Gaber, M. & Ahmed, M. (2023).** "Malware Detection with Artificial Intelligence: A Systematic Literature Review." *ACM Computing Surveys*. [https://dl.acm.org/doi/pdf/10.1145/3638552](https://dl.acm.org/doi/pdf/10.1145/3638552)
   *Relevance:* Systematic review of what "AI-powered" malware detection actually entails (feature selection, dataset quality, static vs. dynamic analysis). Stage 1 does not use ML — this is the honesty baseline for any future claim of "AI scanning" and the roadmap for Stage 2/3.

10. **Raff, E. & Nicholas, C. (2020).** "A Survey of Machine Learning Methods and Challenges for Windows Malware Classification." arXiv:2006.09271. [https://arxiv.org/abs/2006.09271](https://arxiv.org/abs/2006.09271)
    *Relevance:* Practical constraints (labeling, drift, adversarial robustness) relevant to any future move from Stage 1's static regex patterns to a trained classifier.

11. **Noever, D. & McKee, F. (2025).** "Infecting Generative AI With Viruses." arXiv:2501.05542. [https://arxiv.org/abs/2501.05542](https://arxiv.org/abs/2501.05542)
    *Relevance:* Shows EICAR test signatures can be smuggled inside JPEGs and survive into LLM workspaces — a concrete case for why Stage 1's binary files (currently passed through after only a size/MIME check) need real content inspection before being called "safe."

---

### How this bibliography is used

Stage 1's [technical paper](../stage-1-technical-paper.md) references these sources when describing the threat model, the gap between "pattern scanning" and true sandbox/CDR/ML-based detection, and the Stage 2+ roadmap. None of the above justifies describing Stage 1 as a production anti-malware system — see the Limitations section of the technical paper.
