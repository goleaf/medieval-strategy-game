describe("Landing page", () => {
  it("loads and renders header actions", () => {
    cy.visit("/")
    cy.contains("h1", "Medieval Strategy").should("be.visible")
    cy.contains("button", "Login").should("exist")
    cy.contains("button", "Join Now").should("exist")
  })
})

