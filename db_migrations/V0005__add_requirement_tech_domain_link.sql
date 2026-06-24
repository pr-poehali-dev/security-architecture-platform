CREATE TABLE IF NOT EXISTS t_p84706301_security_architectur.requirement_tech_domain (
    requirement_id TEXT NOT NULL,
    tech_domain_id TEXT NOT NULL,
    PRIMARY KEY (requirement_id),
    CONSTRAINT fk_rtd_req FOREIGN KEY (requirement_id) REFERENCES t_p84706301_security_architectur.requirements(id),
    CONSTRAINT fk_rtd_tech FOREIGN KEY (tech_domain_id) REFERENCES t_p84706301_security_architectur.tech_domains(id)
);