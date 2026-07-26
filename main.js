      const observer = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (entry.isIntersecting) {
              entry.target.classList.add("is-visible");
            }
          });
        },
        { threshold: 0.18 }
      );

      document.querySelectorAll(".fade-up").forEach((el) => observer.observe(el));

      const reviewsTrack = document.getElementById("reviewsTrack");
      const reviewsMarquee = document.querySelector(".reviews__marquee");
      if (reviewsTrack) {
        const overflowingParagraphs = [...reviewsTrack.querySelectorAll(".review-card p")].filter(
          (p) => p.scrollHeight - p.clientHeight > 2
        );

        overflowingParagraphs.forEach((p) => {
          const btn = document.createElement("button");
          btn.type = "button";
          btn.className = "review-card__more";
          btn.textContent = "Leer más";
          p.insertAdjacentElement("afterend", btn);
        });

        reviewsTrack.addEventListener("click", (event) => {
          const btn = event.target.closest(".review-card__more");
          if (!btn) return;
          const card = btn.closest(".review-card");
          const expanded = card.classList.toggle("is-expanded");
          btn.textContent = expanded ? "Leer menos" : "Leer más";
          reviewsMarquee?.classList.toggle(
            "is-paused",
            !!reviewsTrack.querySelector(".review-card.is-expanded")
          );
        });

        [...reviewsTrack.children].forEach((card) => {
          const clone = card.cloneNode(true);
          clone.setAttribute("aria-hidden", "true");
          reviewsTrack.appendChild(clone);
        });
      }

      const steps = [...document.querySelectorAll(".step")];
      const storyImages = [...document.querySelectorAll(".story__image")];

      const setActiveStep = (index) => {
        steps.forEach((step, i) => step.classList.toggle("is-current", i === index));
        storyImages.forEach((img, i) => img.classList.toggle("is-active", i === index));
      };

      const stepObserver = new IntersectionObserver(
        (entries) => {
          const visible = entries
            .filter((entry) => entry.isIntersecting)
            .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];

          if (!visible) return;
          setActiveStep(Number(visible.target.dataset.step));
        },
        {
          threshold: [0.3, 0.5, 0.75],
          rootMargin: "-10% 0px -30% 0px"
        }
      );

      steps.forEach((step) => stepObserver.observe(step));