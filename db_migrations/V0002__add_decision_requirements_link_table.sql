CREATE TABLE IF NOT EXISTS t_p84706301_security_architectur.decision_requirements (
    decision_id text NOT NULL REFERENCES t_p84706301_security_architectur.decisions(id),
    requirement_id text NOT NULL REFERENCES t_p84706301_security_architectur.requirements(id),
    PRIMARY KEY (decision_id, requirement_id)
);