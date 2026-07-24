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